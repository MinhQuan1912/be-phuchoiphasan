import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';

import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './dto/auth.dto';
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

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto);
    return {
      message: 'Mã xác nhận đã được gửi tới hòm thư',
    };
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    await this.auth.verifyOtp(dto);
    return { message: 'Mã xác nhận hợp lệ' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto);
    return { message: 'Đặt lại mật khẩu thành công, hãy đăng nhập lại' };
  }
}
