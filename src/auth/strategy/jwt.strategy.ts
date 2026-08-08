import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow('JWT_SECRET'),
    });
  }

  async validate(payload: {
    sub: string;
    username: string;
    tokenIssuedAt?: number;
  }) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: payload.sub },
    });
    if (!admin) throw new UnauthorizedException();

    // Chỉ token của lần đăng nhập gần nhất mới được chấp nhận. Token cũ (kể cả
    // token phát trước khi có cơ chế này, không mang `tokenIssuedAt`) đều lệch mốc.
    if (payload.tokenIssuedAt !== admin.tokenIssuedAt.getTime()) {
      throw new UnauthorizedException(
        'Phiên đăng nhập đã kết thúc do tài khoản được đăng nhập ở nơi khác',
      );
    }

    return { id: admin.id, username: admin.username };
  }
}
