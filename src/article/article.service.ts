import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ArticleStatus,
  BlockType,
  CategoryKind,
  Court,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { slugifyOrDefault } from '../common/utils/slugify';
import { unaccentedContains } from '../common/utils/search';
import { toExcerpt } from '../common/utils/excerpt';
import { decodeOriginalName } from '../common/utils/filename';
import {
  CreateArticleDto,
  UpdateArticleDto,
  ListArticleQueryDto,
} from './dto/article.dto';

type BlockInput =
  | {
      type: 'TEXT';
      content: string;
    }
  | {
      type: 'IMAGE';
      imageIndex: number;
      content?: string;
      caption?: string;
    }
  | {
      type: 'FILE';
      fileIndex: number;
      content?: string;
      caption?: string;
    };

function normalizeCaption(raw?: string): string | null {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

function fileLabel(caption: string | undefined, file?: Express.Multer.File) {
  const fallback = file ? decodeOriginalName(file.originalname) : undefined;
  return normalizeCaption(caption) ?? fallback ?? null;
}

const PDF_MIME = 'application/pdf';
const MAX_FILE_BYTES = 20 * 1024 * 1024;

function assertPdfFiles(files: Express.Multer.File[]) {
  for (const f of files) {
    if (f.mimetype !== PDF_MIME) {
      throw new BadRequestException(
        `Tệp "${f.originalname}" không phải PDF — chỉ nhận tệp .pdf`,
      );
    }
    if (f.size > MAX_FILE_BYTES) {
      throw new BadRequestException(
        `Tệp "${f.originalname}" vượt quá 20MB`,
      );
    }
  }
}

export const MAX_FEATURED = 3;

export interface UnfeaturedArticle {
  id: string;
  title: string;
}


const adminArticleSelect = {
  id: true,
  title: true,
  slug: true,
  thumbnail: true,
  status: true,
  featured: true,
  views: true,
  court: true,
  documentCode: true,
  effectiveDate: true,
  categoryId: true,
  category: { select: { id: true, name: true, slug: true, kind: true } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ArticleSelect;

@Injectable()
export class ArticleService {
  private readonly logger = new Logger(ArticleService.name);

  constructor(private prisma: PrismaService, private s3: S3Service) {}

  private async cleanupS3(urls: string[]) {
    for (const url of urls) {
      if (!url) continue;
      try {
        await this.s3.delete(url);
      } catch (err) {
        this.logger.error(`Không xóa được file S3: ${url}`, err as Error);
      }
    }
  }

  /**
   * Ghi lại chặng upload S3 — chặng duy nhất có thể mất vài giây khi lưu bài.
   * Có dòng log này thì lần sau chậm là biết ngay do file hay do chỗ khác.
   */
  private logUpload(
    action: string,
    startedAt: number,
    thumbnail: Express.Multer.File | undefined,
    images: Express.Multer.File[],
    files: Express.Multer.File[],
  ) {
    const all = [...(thumbnail ? [thumbnail] : []), ...images, ...files];
    if (!all.length) return;
    const mb = all.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024;
    this.logger.log(
      `[${action}] Upload S3: ${all.length} file (${mb.toFixed(2)}MB) trong ${Date.now() - startedAt}ms` +
        ` — ảnh đại diện ${thumbnail ? 1 : 0}, ảnh trong bài ${images.length}, tệp ${files.length}`,
    );
  }

  private async getCategoryOrThrow(categoryId: string) {
    const found = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, kind: true },
    });
    if (!found) throw new BadRequestException('Chuyên mục không tồn tại');
    return found;
  }

  private async isSlugTaken(slug: string, excludeId?: string) {
    const found = await this.prisma.article.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    return !!found;
  }

  private async resolveManualSlug(raw: string, excludeId?: string) {
    const slug = slugifyOrDefault(raw);
    if (await this.isSlugTaken(slug, excludeId)) {
      throw new BadRequestException(`Slug "${slug}" đã được dùng cho bài khác`);
    }
    return slug;
  }

  private async generateSlugFromTitle(title: string, excludeId?: string) {
    const base = slugifyOrDefault(title);
    if (!(await this.isSlugTaken(base, excludeId))) return base;

    const taken = new Set(
      (
        await this.prisma.article.findMany({
          where: {
            slug: { startsWith: `${base}-` },
            ...(excludeId ? { id: { not: excludeId } } : {}),
          },
          select: { slug: true },
        })
      ).map((a) => a.slug),
    );

    for (let i = 2; i < 1000; i++) {
      const candidate = `${base}-${i}`;
      if (!taken.has(candidate)) return candidate;
    }
    throw new BadRequestException('Không sinh được slug, vui lòng nhập thủ công');
  }

  private async enforceFeaturedLimit(keepId: string): Promise<UnfeaturedArticle[]> {
    const featured = await this.prisma.article.findMany({
      where: { featured: true, status: ArticleStatus.PUBLISHED },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true },
    });
    if (featured.length <= MAX_FEATURED) return [];

    const keep = new Set<string>();
    if (featured.some((a) => a.id === keepId)) keep.add(keepId);
    for (const a of featured) {
      if (keep.size >= MAX_FEATURED) break;
      keep.add(a.id);
    }

    const dropped = featured.filter((a) => !keep.has(a.id));
    if (!dropped.length) return [];

    await this.prisma.article.updateMany({
      where: { id: { in: dropped.map((a) => a.id) } },
      data: { featured: false },
    });
    this.logger.log(
      `Bỏ nổi bật ${dropped.length} bài để giữ tối đa ${MAX_FEATURED}: ${dropped
        .map((a) => a.title)
        .join(', ')}`,
    );
    return dropped;
  }

  private parseBlocks(raw: string): BlockInput[] {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error();
      return parsed;
    } catch {
      throw new BadRequestException('blocks phải là JSON hợp lệ');
    }
  }

  // ---------- PUBLIC ----------
  async findAllPublic(
    page = 1,
    limit = 10,
    categorySlug?: string,
    kind?: CategoryKind,
    court?: string,
    featured?: boolean,
    q?: string,
    sort?: 'views',
  ) {
    const skip = (page - 1) * limit;
    const keyword = q?.trim();
    const categoryFilter = {
      ...(categorySlug ? { slug: categorySlug } : {}),
      ...(kind ? { kind } : {}),
    };
    const courtFilter = Object.values(Court).includes(court as Court)
      ? (court as Court)
      : undefined;
    const where: Prisma.ArticleWhereInput = {
      status: ArticleStatus.PUBLISHED,
      ...(Object.keys(categoryFilter).length ? { category: categoryFilter } : {}),
      ...(courtFilter ? { court: courtFilter } : {}),
      ...(featured !== undefined ? { featured } : {}),
      ...(keyword ? { id: { in: await this.searchIdsByTitle(keyword) } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy:
          sort === 'views'
            ? [{ views: 'desc' }, { createdAt: 'desc' }]
            : kind === CategoryKind.LEGAL
              ? [{ effectiveDate: 'desc' }, { createdAt: 'desc' }]
              : { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          thumbnail: true,
          featured: true,
          views: true,
          court: true,
          documentCode: true,
          effectiveDate: true,
          createdAt: true,
          category: { select: { id: true, name: true, slug: true, kind: true } },
          blocks: {
            where: { type: BlockType.TEXT },
            orderBy: { order: 'asc' },
            take: 1,
            select: { content: true },
          },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    const items = rows.map(({ blocks, ...article }) => ({
      ...article,
      excerpt: toExcerpt(blocks[0]?.content),
    }));

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOnePublicBySlug(slug: string) {
    const article = await this.prisma.article.findFirst({
      where: { slug, status: ArticleStatus.PUBLISHED },
      include: {
        blocks: { orderBy: { order: 'asc' } },
        category: { select: { id: true, name: true, slug: true, kind: true } },
      },
    });
    if (!article) throw new NotFoundException('Không tìm thấy bài viết');

    return article;
  }
  
  async countView(slug: string) {
    const article = await this.prisma.article.findFirst({
      where: { slug, status: ArticleStatus.PUBLISHED },
      select: { id: true },
    });
    if (!article) throw new NotFoundException('Không tìm thấy bài viết');

    const updated = await this.prisma.article.update({
      where: { id: article.id },
      data: { views: { increment: 1 } },
      select: { views: true },
    });
    return { views: updated.views };
  }


  private async searchIdsByTitle(q: string) {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT "id" FROM "Article" WHERE ${unaccentedContains(
        Prisma.sql`"title"`,
        q,
      )}`,
    );
    return rows.map((r) => r.id);
  }

  // ---------- ADMIN ----------
  async findAllAdmin(query: ListArticleQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const q = query.q?.trim();
    const where: Prisma.ArticleWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.kind ? { category: { kind: query.kind } } : {}),
      ...(query.court ? { court: query.court } : {}),
      ...(query.featured !== undefined ? { featured: query.featured } : {}),
      ...(q ? { id: { in: await this.searchIdsByTitle(q) } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: adminArticleSelect,
      }),
      this.prisma.article.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneAdmin(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        blocks: { orderBy: { order: 'asc' } },
        category: { select: { id: true, name: true, slug: true, kind: true } },
      },
    });
    if (!article) throw new NotFoundException('Không tìm thấy bài viết');
    return article;
  }


  async stats(kind: CategoryKind = CategoryKind.NEWS) {
    const byKind: Prisma.ArticleWhereInput = { category: { kind } };
    const [total, published, draft, categories, notices, viewsAgg] =
      await Promise.all([
        this.prisma.article.count({ where: byKind }),
        this.prisma.article.count({
          where: { ...byKind, status: ArticleStatus.PUBLISHED },
        }),
        this.prisma.article.count({
          where: { ...byKind, status: ArticleStatus.DRAFT },
        }),
        this.prisma.category.count({ where: { kind } }),
        this.prisma.article.count({
          where: { category: { kind: CategoryKind.NOTICE } },
        }),
        this.prisma.article.aggregate({ _sum: { views: true } }),
      ]);
    return {
      total,
      published,
      draft,
      categories,
      notices,
      views: viewsAgg._sum.views ?? 0,
    };
  }

  async setStatus(id: string, status: ArticleStatus) {
    const existing = await this.prisma.article.findUnique({
      where: { id },
      select: { id: true, featured: true },
    });
    if (!existing) throw new NotFoundException('Không tìm thấy bài viết');

    const article = await this.prisma.article.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });

    const unfeatured =
      existing.featured && status === ArticleStatus.PUBLISHED
        ? await this.enforceFeaturedLimit(id)
        : [];

    return { article, unfeatured };
  }

  async create(
    dto: CreateArticleDto,
    thumbnail: Express.Multer.File | undefined,
    contentImages: Express.Multer.File[],
    contentFiles: Express.Multer.File[] = [],
  ) {
    const blocks = this.parseBlocks(dto.blocks);
    await this.getCategoryOrThrow(dto.categoryId);
    if (!thumbnail) {
      throw new BadRequestException('Thiếu ảnh đại diện');
    }
    assertPdfFiles(contentFiles);

    const slug = dto.slug
      ? await this.resolveManualSlug(dto.slug)
      : await this.generateSlugFromTitle(dto.title);
    const images = contentImages || [];
    const uploadStart = Date.now();
    const [thumbnailUrl, ...restUrls] = await Promise.all([
      this.s3.upload(thumbnail),
      ...images.map((f) => this.s3.upload(f)),
      ...contentFiles.map((f) => this.s3.upload(f, 'files')),
    ]);
    const uploadedUrls = restUrls.slice(0, images.length);
    const uploadedFileUrls = restUrls.slice(images.length);

    this.logUpload('create', uploadStart, thumbnail, images, contentFiles);

    try {
      const blockData = blocks.map((b, i) => {
        if (b.type === 'IMAGE') {
          const url = uploadedUrls[b.imageIndex];
          if (!url) throw new BadRequestException(`Thiếu ảnh cho block ${i}`);
          return {
            type: 'IMAGE' as const,
            content: url,
            caption: normalizeCaption(b.caption),
            order: i,
          };
        }
        if (b.type === 'FILE') {
          const url = uploadedFileUrls[b.fileIndex];
          if (!url) throw new BadRequestException(`Thiếu tệp cho block ${i}`);
          return {
            type: 'FILE' as const,
            content: url,
            caption: fileLabel(b.caption, contentFiles[b.fileIndex]),
            order: i,
          };
        }
        return { type: 'TEXT' as const, content: b.content || '', order: i };
      });

      const article = await this.prisma.article.create({
        data: {
          title: dto.title,
          slug,
          thumbnail: thumbnailUrl,
          status: dto.status ?? ArticleStatus.DRAFT,
          featured: dto.featured ?? false,
          court: dto.court ?? null,
          documentCode: dto.documentCode ?? null,
          effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
          categoryId: dto.categoryId,
          blocks: { create: blockData },
        },
        include: {
          blocks: { orderBy: { order: 'asc' } },
          category: { select: { id: true, name: true, slug: true, kind: true } },
        },
      });

      const unfeatured =
        article.featured && article.status === ArticleStatus.PUBLISHED
          ? await this.enforceFeaturedLimit(article.id)
          : [];

      return { article, unfeatured };
    } catch (err) {
      await this.cleanupS3([
        thumbnailUrl,
        ...uploadedUrls,
        ...uploadedFileUrls,
      ]);
      throw err;
    }
  }

  async update(
    id: string,
    dto: UpdateArticleDto,
    thumbnail: Express.Multer.File | undefined,
    contentImages: Express.Multer.File[],
    contentFiles: Express.Multer.File[] = [],
  ) {
    assertPdfFiles(contentFiles);
    const existing = await this.prisma.article.findUnique({
      where: { id },
      include: { blocks: true, category: { select: { kind: true } } },
    });
    if (!existing) throw new NotFoundException('Không tìm thấy bài viết');

    const data: Prisma.ArticleUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.featured !== undefined) data.featured = dto.featured;
    if (dto.court !== undefined) data.court = dto.court;
    if (dto.documentCode !== undefined) data.documentCode = dto.documentCode;
    if (dto.effectiveDate !== undefined) {
      data.effectiveDate = dto.effectiveDate ? new Date(dto.effectiveDate) : null;
    }

    if (dto.categoryId !== undefined) {
      await this.getCategoryOrThrow(dto.categoryId);
      data.category = { connect: { id: dto.categoryId } };
    }
    if (dto.slug !== undefined) {
      data.slug = await this.resolveManualSlug(dto.slug, id);
    }

    const uploaded: string[] = [];
    const orphaned: string[] = [];

    try {
      if (thumbnail) {
        data.thumbnail = await this.s3.upload(thumbnail);
        uploaded.push(data.thumbnail);
        orphaned.push(existing.thumbnail);
      }

      let blockData:
        | {
            type: 'TEXT' | 'IMAGE' | 'FILE';
            content: string;
            order: number;
            caption?: string | null;
          }[]
        | null = null;

      if (dto.blocks !== undefined) {
        const blocks = this.parseBlocks(dto.blocks);

        const images = contentImages || [];
        const uploadStart = Date.now();
        const urls = await Promise.all([
          ...images.map((f) => this.s3.upload(f)),
          ...contentFiles.map((f) => this.s3.upload(f, 'files')),
        ]);
        const uploadedUrls = urls.slice(0, images.length);
        const uploadedFileUrls = urls.slice(images.length);
        uploaded.push(...urls);

        this.logUpload('update', uploadStart, undefined, images, contentFiles);

        blockData = blocks.map((b, i) => {
          if (b.type === 'IMAGE') {
            const caption = normalizeCaption(b.caption);
            if (b.content && b.content.startsWith('http')) {
              return {
                type: 'IMAGE' as const,
                content: b.content,
                caption,
                order: i,
              };
            }
            const url = uploadedUrls[b.imageIndex];
            if (!url) throw new BadRequestException(`Thiếu ảnh cho block ${i}`);
            return { type: 'IMAGE' as const, content: url, caption, order: i };
          }
          if (b.type === 'FILE') {
            if (b.content && b.content.startsWith('http')) {
              return {
                type: 'FILE' as const,
                content: b.content,
                caption: fileLabel(b.caption),
                order: i,
              };
            }
            const url = uploadedFileUrls[b.fileIndex];
            if (!url) throw new BadRequestException(`Thiếu tệp cho block ${i}`);
            return {
              type: 'FILE' as const,
              content: url,
              caption: fileLabel(b.caption, contentFiles[b.fileIndex]),
              order: i,
            };
          }
          return { type: 'TEXT' as const, content: b.content || '', order: i };
        });

        const keepUrls = new Set(
          blockData
            .filter((b) => b.type === 'IMAGE' || b.type === 'FILE')
            .map((b) => b.content),
        );
        for (const old of existing.blocks) {
          if (old.type !== 'TEXT' && !keepUrls.has(old.content)) {
            orphaned.push(old.content);
          }
        }

        data.blocks = { create: blockData };
      }

      const article = await this.prisma.$transaction(async (tx) => {
        if (blockData) {
          await tx.contentBlock.deleteMany({ where: { articleId: id } });
        }
        return tx.article.update({
          where: { id },
          data,
          include: {
            blocks: { orderBy: { order: 'asc' } },
            category: { select: { id: true, name: true, slug: true, kind: true } },
          },
        });
      });

      await this.cleanupS3(orphaned);

      const unfeatured =
        article.featured && article.status === ArticleStatus.PUBLISHED
          ? await this.enforceFeaturedLimit(article.id)
          : [];

      return { article, unfeatured };
    } catch (err) {
      await this.cleanupS3(uploaded);
      throw err;
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.article.findUnique({
      where: { id },
      include: { blocks: true },
    });
    if (!existing) throw new NotFoundException('Không tìm thấy bài viết');
    await this.prisma.article.delete({ where: { id } });
    const uploads = existing.blocks
      .filter((b) => b.type !== 'TEXT')
      .map((b) => b.content);
    await this.cleanupS3([existing.thumbnail, ...uploads]);

    return { id };
  }
}
