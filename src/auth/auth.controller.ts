import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';

import { ChangePasswordDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guard/jwt-auth.guard';

@Controller('auth/admin')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const token = await this.auth.validateAndSign(dto);
    return {
      message: 'Đăng nhập thành công',
      data: { accessToken: token },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req) {
    return {
      message: 'Lấy thông tin tài khoản thành công',
      data: req.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(req.user.id, dto);
    return { message: 'Đổi mật khẩu thành công' };
  }
}
