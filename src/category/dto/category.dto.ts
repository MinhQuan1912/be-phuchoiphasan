import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { CategoryKind } from '@prisma/client';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  // Tên tiếng Anh — bỏ trống thì site tiếng Anh dùng tên tiếng Việt
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  nameEn?: string;

  // Bỏ trống thì mặc định NEWS (chuyên mục tin tức)
  @IsOptional()
  @IsEnum(CategoryKind)
  kind?: CategoryKind;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  // Xóa trắng = gỡ tên tiếng Anh
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  nameEn?: string | null;
}
