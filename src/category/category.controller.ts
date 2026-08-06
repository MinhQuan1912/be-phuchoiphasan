import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CategoryKind } from '@prisma/client';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { parseLocale } from '../common/utils/locale';

@Controller('categories')
export class CategoryController {
  constructor(private service: CategoryService) {}

  @Get()
  async findAll(
    @Query('kind') kind?: CategoryKind,
    @Query('lang') lang?: string,
  ) {
    return {
      message: 'Lấy danh sách chuyên mục thành công',
      data: await this.service.findAll(kind, parseLocale(lang)),
    };
  }

  // ---------- ADMIN ----------
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateCategoryDto) {
    return {
      message: 'Tạo chuyên mục thành công',
      data: await this.service.create(dto),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return {
      message: 'Cập nhật chuyên mục thành công',
      data: await this.service.update(id, dto, req.user),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Req() req, @Param('id') id: string) {
    return {
      message: 'Xóa chuyên mục thành công',
      data: await this.service.remove(id, req.user),
    };
  }
}
