import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async validateAndSign(dto: LoginDto): Promise<string> {
    const admin = await this.prisma.admin.findUnique({
      where: { username: dto.username },
    });
    if (!admin)
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không đúng');

    const valid = await bcrypt.compare(dto.password, admin.password);
    if (!valid)
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không đúng');

    const tokenIssuedAt = new Date();
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: { tokenIssuedAt },
    });

    return this.jwt.sign({
      sub: admin.id,
      username: admin.username,
      tokenIssuedAt: tokenIssuedAt.getTime(),
    });
  }

  async changePassword(adminId: string, dto: ChangePasswordDto): Promise<void> {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });
    if (!admin) throw new BadRequestException('Không tìm thấy tài khoản');
    const valid = await bcrypt.compare(dto.oldPassword, admin.password);
    if (!valid) throw new BadRequestException('Mật khẩu cũ không đúng');

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.admin.update({
      where: { id: adminId },
      data: { password: hashed },
    });
  }
}
