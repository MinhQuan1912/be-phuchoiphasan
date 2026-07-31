import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { CreateContactDto } from './dto/contact.dto';

// Giữ đồng bộ với --color-primary của Frontend/Admin (tông đậm/nhạt lấy từ cùng thang xanh)
const BRAND = '#22c55e';
const BRAND_DARK = '#15803d';
const BRAND_SOFT = '#dcfce7';

const COMPANY_NAME = 'Công ty Hợp danh Quản lý và Thanh lý tài sản Việt Nam';

interface InfoRow {
  label: string;
  value: string;
  href?: string;
}

const SERVICE_LABEL: Record<string, string> = {
  'pha-san': 'Phá sản',
  'phuc-hoi': 'Phục hồi',
  'tu-van': 'Tư vấn pháp lý',
  'quan-ly-tai-san': 'Quản lý tài sản',
  khac: 'Khác',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private mail: MailService) {}

  send(dto: CreateContactDto) {
    const service = this.describeService(dto);
    const sentAt = this.formatTime(new Date());

    const rows: InfoRow[] = [
      { label: 'Họ và tên', value: dto.name },
      { label: 'Email', value: dto.email, href: `mailto:${dto.email}` },
      {
        label: 'Số điện thoại',
        value: dto.phone,
        href: `tel:${dto.phone.replace(/[^\d+]/g, '')}`,
      },
      { label: 'Thời gian gửi', value: sentAt },
    ];

    const text = [
      'YÊU CẦU TƯ VẤN MỚI TỪ WEBSITE',
      '',
      `Dịch vụ cần tư vấn: ${service}`,
      ...rows.map((r) => `${r.label}: ${r.value}`),
      '',
      'Nội dung cần tư vấn',
      '-------------------',
      dto.message,
    ].join('\n');

    void this.mail
      .sendToCompany({
        subject: `[Liên hệ website] ${service} — ${dto.name}`,
        fromName: `${dto.name} (qua website)`,
        replyTo: `${dto.name} <${dto.email}>`,
        text,
        html: this.buildHtml(service, rows, dto),
      })
      .catch((error) => {
        this.logger.error(
          `Gửi mail liên hệ thất bại — yêu cầu chưa tới hòm thư:\n${text}`,
          error as Error,
        );
      });

    return { sentAt };
  }

  private describeService(dto: CreateContactDto): string {
    const label = SERVICE_LABEL[dto.service] ?? dto.service;
    const other = dto.serviceOther?.trim();
    return dto.service === 'khac' && other ? `${label} — ${other}` : label;
  }

  private formatTime(d: Date): string {
    const p = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(d);
    const get = (t: string) => p.find((x) => x.type === t)?.value ?? '';
    return `${get('hour')}:${get('minute')} — ${get('day')}/${get('month')}/${get('year')}`;
  }

  private buildHtml(
    service: string,
    rows: InfoRow[],
    dto: CreateContactDto,
  ): string {
    const cells = rows
      .map(({ label, value, href }, i) => {
        const border = i === 0 ? '' : 'border-top:1px solid #eef0f2;';
        const shown = href
          ? `<a href="${escapeHtml(href)}" style="color:${BRAND};text-decoration:none">${escapeHtml(value)}</a>`
          : escapeHtml(value);
        return `
              <tr>
                <td style="${border}padding:11px 0;width:132px;vertical-align:top;font-size:13px;color:#6b7280">${escapeHtml(label)}</td>
                <td style="${border}padding:11px 0;vertical-align:top;font-size:15px;font-weight:700;color:#111827">${shown}</td>
              </tr>`;
      })
      .join('');

    const message = escapeHtml(dto.message).replace(/\r?\n/g, '<br>');

    return `<!doctype html>
<html lang="vi">
<body style="margin:0;padding:0;background:#eef1f0">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(service)} · ${escapeHtml(dto.name)} · ${escapeHtml(dto.phone)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f0;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:'Segoe UI',Arial,Helvetica,sans-serif">

          <tr>
            <td style="background:${BRAND};padding:26px 32px">
              <div style="font-size:12px;font-weight:700;letter-spacing:1px;color:#d8f5e2;text-transform:uppercase">${COMPANY_NAME}</div>
              <div style="margin-top:6px;font-size:22px;font-weight:800;color:#ffffff">Yêu cầu tư vấn mới</div>
            </td>
          </tr>

          <tr>
            <td style="padding:26px 32px 8px">
              <span style="display:inline-block;padding:7px 15px;border-radius:999px;background:${BRAND_SOFT};color:${BRAND_DARK};font-size:14px;font-weight:700">${escapeHtml(service)}</span>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 32px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cells}</table>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 32px 30px">
              <div style="font-size:12px;font-weight:700;letter-spacing:1px;color:#6b7280;text-transform:uppercase">Nội dung cần tư vấn</div>
              <div style="margin-top:10px;font-size:15px;line-height:1.7;color:#374151">${message}</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
