import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { CategoryKind } from '@prisma/client';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

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
}
