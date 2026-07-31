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

/**
 * multipart/form-data và query string chỉ gửi chuỗi nên "true"/"false" phải đổi
 * về boolean; giữ nguyên undefined khi client không gửi (update chỉ ghi field
 * nào thực sự có mặt).
 */
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

  // Bỏ trống thì server tự sinh slug từ tiêu đề
  @IsOptional()
  @IsString()
  slug?: string;

  // multipart/form-data gửi mọi thứ dạng chuỗi nên chỉ nhận đúng tên enum
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  // Bài nổi bật — multipart gửi chuỗi "true"/"false"
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  featured?: boolean;

  // Tòa chuyên trách — chỉ dùng cho thông báo phá sản; multipart gửi chuỗi rỗng thì coi như bỏ trống
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(Court)
  court?: Court;

  // Số hiệu văn bản (vd "NĐ 22/2015/NĐ-CP") — chỉ dùng cho văn bản pháp luật
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  @IsNotEmpty()
  documentCode?: string;

  // Ngày hiệu lực dạng ISO (vd "2015-04-06") — chỉ dùng cho văn bản pháp luật
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

  // Không gửi thì slug giữ nguyên — đổi tiêu đề không làm gãy link cũ
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

  // Gửi chuỗi rỗng để xóa tòa chuyên trách
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsEnum(Court)
  court?: Court | null;

  // Gửi chuỗi rỗng để xóa số hiệu văn bản
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @IsNotEmpty()
  documentCode?: string | null;

  // Gửi chuỗi rỗng để xóa ngày hiệu lực
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

  // Lọc theo loại: NEWS (tin tức) hoặc NOTICE (thông báo)
  @IsOptional()
  @IsEnum(CategoryKind)
  kind?: CategoryKind;

  // Lọc theo tòa chuyên trách
  @IsOptional()
  @IsEnum(Court)
  court?: Court;

  // Lọc bài nổi bật
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  featured?: boolean;

  // Tìm theo tiêu đề
  @IsOptional()
  @IsString()
  q?: string;
}
