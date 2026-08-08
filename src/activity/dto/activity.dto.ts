import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { CategoryKind } from '@prisma/client';

export class ListActivityQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsISO8601({}, { message: 'Ngày bắt đầu không hợp lệ' })
  from?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Ngày kết thúc không hợp lệ' })
  to?: string;

  @IsOptional()
  @IsEnum(CategoryKind, { message: 'Loại nội dung không hợp lệ' })
  kind?: CategoryKind;

  @IsOptional()
  @IsUUID('4', { message: 'Tài khoản không hợp lệ' })
  adminId?: string;
}
