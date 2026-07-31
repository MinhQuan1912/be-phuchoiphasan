import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CategoryKind } from '@prisma/client';
import {
  ArticleService,
  MAX_FEATURED,
  type UnfeaturedArticle,
} from './article.service';

import {
  CreateArticleDto,
  UpdateArticleDto,
  UpdateStatusDto,
  ListArticleQueryDto,
} from './dto/article.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

// Chặn ở tầng multer để tệp quá khổ không kịp nằm hết trong RAM.
// Ngưỡng khớp MAX_FILE_BYTES trong article.service (kiểm tra lại kèm thông báo rõ ràng).
const UPLOAD_LIMITS = { limits: { fileSize: 20 * 1024 * 1024 } };

function withFeaturedNote(base: string, unfeatured: UnfeaturedArticle[]) {
  if (!unfeatured.length) return base;
  const titles = unfeatured.map((a) => `"${a.title}"`).join(', ');
  return `${base}. Đã bỏ nổi bật ${titles} để giữ tối đa ${MAX_FEATURED} bài nổi bật`;
}

@Controller('articles')
export class ArticleController {
  constructor(private service: ArticleService) {}

  // ---------- PUBLIC (không cần đăng nhập) ----------
  @Get()
  async findAllPublic(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('category') category?: string,
    @Query('kind') kind?: CategoryKind,
    @Query('court') court?: string,
    @Query('featured') featured?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
  ) {
    return {
      message: 'Lấy danh sách bài viết thành công',
      data: await this.service.findAllPublic(
        +page,
        +limit,
        category,
        kind,
        court,
        featured === undefined ? undefined : featured === 'true',
        q,
        sort === 'views' ? 'views' : undefined,
      ),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/list')
  async findAllAdmin(@Query() query: ListArticleQueryDto) {
    return {
      message: 'Lấy danh sách bài viết thành công',
      data: await this.service.findAllAdmin(query),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/stats')
  async stats() {
    return {
      message: 'Lấy thống kê bài viết thành công',
      data: await this.service.stats(),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/:id')
  async findOneAdmin(@Param('id') id: string) {
    return {
      message: 'Lấy chi tiết bài viết thành công',
     data: await this.service.findOneAdmin(id),
    };
  }

  @Get(':slug')
  async findOneBySlug(@Param('slug') slug: string) {
    return {
      message: 'Lấy chi tiết bài viết thành công',
      data: await this.service.findOnePublicBySlug(slug),
    };
  }

  @Post(':slug/view')
  @HttpCode(HttpStatus.OK)
  async countView(@Param('slug') slug: string) {
    return {
      message: 'Đã ghi nhận lượt xem',
      data: await this.service.countView(slug),
    };
  }

  // ---------- ADMIN ----------
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'thumbnail', maxCount: 1 },
        { name: 'contentImages', maxCount: 20 },
        { name: 'contentFiles', maxCount: 10 },
      ],
      UPLOAD_LIMITS,
    ),
  )
  async create(
    @Body() dto: CreateArticleDto,
    @UploadedFiles()
    files: {
      thumbnail?: Express.Multer.File[];
      contentImages?: Express.Multer.File[];
      contentFiles?: Express.Multer.File[];
    },
  ) {
    const { article, unfeatured } = await this.service.create(
      dto,
      files.thumbnail?.[0],
      files.contentImages || [],
      files.contentFiles || [],
    );
    return {
      message: withFeaturedNote('Tạo bài viết thành công', unfeatured),
      data: article,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'thumbnail', maxCount: 1 },
        { name: 'contentImages', maxCount: 20 },
        { name: 'contentFiles', maxCount: 10 },
      ],
      UPLOAD_LIMITS,
    ),
  )
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @UploadedFiles()
    files: {
      thumbnail?: Express.Multer.File[];
      contentImages?: Express.Multer.File[];
      contentFiles?: Express.Multer.File[];
    },
  ) {
    const { article, unfeatured } = await this.service.update(
      id,
      dto,
      files.thumbnail?.[0],
      files.contentImages || [],
      files.contentFiles || [],
    );
    return {
      message: withFeaturedNote('Cập nhật bài viết thành công', unfeatured),
      data: article,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  async setStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    const { article, unfeatured } = await this.service.setStatus(id, dto.status);
    const base =
      dto.status === 'PUBLISHED' ? 'Đã đăng bài viết' : 'Đã chuyển về bản nháp';
    return {
      message: withFeaturedNote(base, unfeatured),
      data: article,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return {
      message: 'Xóa bài viết thành công',
      data: await this.service.remove(id),
    };
  }
}
