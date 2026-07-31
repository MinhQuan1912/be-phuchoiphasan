import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendMailOptions {
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  fromName?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private from: string;
  private fromAddress: string;
  private to: string;

  constructor(private config: ConfigService) {
    const user = this.config.getOrThrow<string>('MAIL_USER');
    this.from = this.config.get<string>('MAIL_FROM') || user;
    this.fromAddress = this.from.match(/<(.+)>/)?.[1]?.trim() ?? this.from;
    this.to = this.config.get<string>('MAIL_TO') || user;

    this.transporter = nodemailer.createTransport({
      host: this.config.getOrThrow<string>('MAIL_HOST'),
      port: Number(this.config.get<string>('MAIL_PORT') ?? 587),
      secure: this.config.get<string>('MAIL_SECURE') === 'true',
      auth: { user, pass: this.config.getOrThrow<string>('MAIL_PASS') },
    });
  }

  async sendToCompany(options: SendMailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: options.fromName
        ? { name: options.fromName, address: this.fromAddress }
        : this.from,
      to: this.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
    });
    this.logger.log(`Đã gửi mail tới ${this.to}: ${options.subject}`);
  }
}
