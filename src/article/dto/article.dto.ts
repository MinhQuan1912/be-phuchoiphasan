import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsInt,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ArticleStatus, CategoryKind, Court } from '@prisma/client';

function toOptionalBoolean({ value }: { value: unknown }) {
  if (value === undefined || value === '') return undefined;
  return value === true || value === 'true';
}

export class CreateArticleDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  blocks: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(Court)
  court?: Court;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @IsNotEmpty()
  documentCode?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsDateString()
  effectiveDate?: string;
}

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  blocks?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  slug?: string;

  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsEnum(Court)
  court?: Court | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @IsNotEmpty()
  documentCode?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsDateString()
  effectiveDate?: string | null;
}

export class UpdateStatusDto {
  @IsEnum(ArticleStatus)
  status: ArticleStatus;
}

export class ListArticleQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(CategoryKind)
  kind?: CategoryKind;

  @IsOptional()
  @IsEnum(Court)
  court?: Court;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsString()
  q?: string;
}
