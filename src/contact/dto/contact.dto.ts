import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateContactDto {
  // Khóa dịch vụ khớp danh sách ở trang Liên hệ của Frontend
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn dịch vụ cần tư vấn' })
  @MaxLength(50)
  service: string;

  // Chỉ dùng khi service = 'khac'
  @IsOptional()
  @IsString()
  @MaxLength(200)
  serviceOther?: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập họ và tên' })
  @MaxLength(100)
  name: string;

  @IsEmail({}, { message: 'Email chưa hợp lệ' })
  @MaxLength(150)
  email: string;

  @Matches(/^[0-9+\s().-]{8,20}$/, { message: 'Số điện thoại chưa hợp lệ' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập nội dung cần tư vấn' })
  @MaxLength(3000)
  message: string;
}
