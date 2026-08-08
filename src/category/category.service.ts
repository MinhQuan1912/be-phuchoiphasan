import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CategoryKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { slugifyOrDefault } from '../common/utils/slugify';
import { pickText, type Locale } from '../common/utils/locale';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { ActivityService, type Actor } from '../activity/activity.service';

@Injectable()
export class CategoryService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
  ) {}

  async findAll(kind?: CategoryKind, locale: Locale = 'vi') {
    const items = await this.prisma.category.findMany({
      where: kind ? { kind } : {},
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        nameEn: true,
        slug: true,
        kind: true,
        _count: { select: { articles: true } },
      },
    });

    return items.map(({ _count, ...c }) => ({
      ...c,
      name: pickText(locale, c.name, c.nameEn),
      articleCount: _count.articles,
    }));
  }

  async create(dto: CreateCategoryDto) {
    const name = dto.name.trim();
    const existingName = await this.prisma.category.findUnique({
      where: { name },
      select: { id: true },
    });
    if (existingName) {
      throw new ConflictException(`Chuyên mục "${name}" đã tồn tại`);
    }

    const slug = await this.generateSlug(name);

    return this.prisma.category.create({
      data: {
        name,
        nameEn: dto.nameEn ?? null,
        slug,
        kind: dto.kind ?? 'NEWS',
      },
      select: { id: true, name: true, nameEn: true, slug: true, kind: true },
    });
  }

  private async generateSlug(name: string, excludeId?: string) {
    const base = slugifyOrDefault(name, 'chuyen-muc');
    const taken = new Set(
      (
        await this.prisma.category.findMany({
          where: {
            OR: [{ slug: base }, { slug: { startsWith: `${base}-` } }],
            ...(excludeId ? { id: { not: excludeId } } : {}),
          },
          select: { slug: true },
        })
      ).map((c) => c.slug),
    );
    if (!taken.has(base)) return base;
    for (let i = 2; i < 1000; i++) {
      if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
    }
    throw new BadRequestException('Không sinh được slug cho chuyên mục');
  }

  async update(id: string, dto: UpdateCategoryDto, actor: Actor) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Không tìm thấy chuyên mục');

    const data: { name?: string; nameEn?: string | null; slug?: string } = {};

    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn;

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      const clash = await this.prisma.category.findFirst({
        where: { name, id: { not: id } },
        select: { id: true },
      });
      if (clash) throw new ConflictException(`Chuyên mục "${name}" đã tồn tại`);
      data.name = name;
      data.slug = await this.generateSlug(name, id);
    }
    const category = await this.prisma.category.update({
      where: { id },
      data,
      select: { id: true, name: true, nameEn: true, slug: true, kind: true },
    });

    await this.activity.log({
      actor,
      action: 'UPDATE',
      targetType: 'CATEGORY',
      targetId: category.id,
      targetTitle: category.name,
      targetKind: category.kind,
    });

    return category;
  }

  async remove(id: string, actor: Actor) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        kind: true,
        _count: { select: { articles: true } },
      },
    });
    if (!existing) throw new NotFoundException('Không tìm thấy chuyên mục');
    if (existing._count.articles > 0) {
      throw new BadRequestException(
        `Chuyên mục "${existing.name}" đang có ${existing._count.articles} bài viết. ` +
          'Hãy chuyển các bài này sang chuyên mục khác trước khi xóa.',
      );
    }

    await this.prisma.category.delete({ where: { id } });

    await this.activity.log({
      actor,
      action: 'DELETE',
      targetType: 'CATEGORY',
      targetId: id,
      targetTitle: existing.name,
      targetKind: existing.kind,
    });

    return { id };
  }
}
