import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './dto/auth.dto';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const COMPANY_NAME = 'Công ty Hợp danh Quản lý và Thanh lý tài sản Việt Nam';
const COMPANY_SHORT = 'VAML';

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function otpEmailHtml(otp: string): string {
  return `
    <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản quản trị ${COMPANY_NAME} (${COMPANY_SHORT}).</p>
    <p>Mã xác nhận của bạn là:</p>
    <p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:16px 0">${otp}</p>
    <p>Mã có hiệu lực trong 10 phút và chỉ dùng được một lần.</p>
    <p>Nếu không phải bạn yêu cầu, hãy bỏ qua email này — mật khẩu hiện tại vẫn giữ nguyên.</p>
  `;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
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

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const username = dto.username.trim();
    const admin = await this.prisma.admin.findUnique({
      where: { username },
      select: { id: true, username: true },
    });

    if (!admin) {
      this.logger.warn(`Yêu cầu quên mật khẩu cho tài khoản không tồn tại`);
      return;
    }
    if (!isEmail(admin.username)) {
      this.logger.warn(
        `Tài khoản "${admin.username}" không phải email nên không gửi được mã OTP`,
      );
      return;
    }

    const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: {
        resetOtpHash: await bcrypt.hash(otp, 10),
        resetOtpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
        resetOtpAttempts: 0,
      },
    });

    try {
      await this.mail.sendTo(admin.username, {
        subject: `Mã xác nhận đặt lại mật khẩu — ${COMPANY_SHORT}`,
        html: otpEmailHtml(otp),
        text: `Mã xác nhận đặt lại mật khẩu của bạn là ${otp}. Mã có hiệu lực trong 10 phút.`,
      });
    } catch (err) {
      await this.prisma.admin.update({
        where: { id: admin.id },
        data: {
          resetOtpHash: null,
          resetOtpExpiresAt: null,
          resetOtpAttempts: 0,
        },
      });
      this.logger.error(
        `Không gửi được mã OTP: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException(
        'Không gửi được mã xác nhận, vui lòng thử lại sau',
      );
    }
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<void> {
    await this.assertValidOtp(dto.username, dto.otp);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const adminId = await this.assertValidOtp(dto.username, dto.otp);

    await this.prisma.admin.update({
      where: { id: adminId },
      data: {
        password: await bcrypt.hash(dto.newPassword, 10),
        tokenIssuedAt: new Date(),
        resetOtpHash: null,
        resetOtpExpiresAt: null,
        resetOtpAttempts: 0,
      },
    });
  }

  private async assertValidOtp(username: string, otp: string): Promise<string> {
    const invalid = new BadRequestException(
      'Mã xác nhận không đúng hoặc đã hết hạn',
    );

    const admin = await this.prisma.admin.findUnique({
      where: { username: username.trim() },
      select: {
        id: true,
        resetOtpHash: true,
        resetOtpExpiresAt: true,
        resetOtpAttempts: true,
      },
    });

    if (
      !admin?.resetOtpHash ||
      !admin.resetOtpExpiresAt ||
      admin.resetOtpExpiresAt.getTime() < Date.now()
    ) {
      throw invalid;
    }

    if (admin.resetOtpAttempts >= OTP_MAX_ATTEMPTS) {
      await this.clearOtp(admin.id);
      throw new BadRequestException(
        'Bạn đã nhập sai mã quá nhiều lần, hãy yêu cầu mã mới',
      );
    }

    if (!(await bcrypt.compare(otp, admin.resetOtpHash))) {
      await this.prisma.admin.update({
        where: { id: admin.id },
        data: { resetOtpAttempts: { increment: 1 } },
      });
      throw invalid;
    }

    return admin.id;
  }

  private async clearOtp(adminId: string): Promise<void> {
    await this.prisma.admin.update({
      where: { id: adminId },
      data: {
        resetOtpHash: null,
        resetOtpExpiresAt: null,
        resetOtpAttempts: 0,
      },
    });
  }
}
