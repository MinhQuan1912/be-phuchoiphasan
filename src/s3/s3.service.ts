import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';
import sharp from 'sharp';
import {
  decodeOriginalName,
  replaceExtension,
  toSafeFileName,
} from '../common/utils/filename';

const AVIF_MIME = 'image/avif';
const AVIF_SKIP_MIMES = new Set([AVIF_MIME, 'image/svg+xml', 'image/gif']);
const AVIF_MAX_WIDTH = 2000;
const AVIF_QUALITY = 55;
const AVIF_EFFORT = 4;

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private s3: S3Client;
  private bucket: string;
  private region: string;

  constructor(private config: ConfigService) {
    this.region = this.config.getOrThrow<string>('AWS_REGION');
    this.bucket = this.config.getOrThrow<string>('AWS_S3_BUCKET');
    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  async upload(file: Express.Multer.File, folder = 'news'): Promise<string> {
    const avif = await this.toAvif(file);
    const body = avif ?? file.buffer;
    const contentType = avif ? AVIF_MIME : file.mimetype;

    const decoded = decodeOriginalName(file.originalname);
    const original = avif ? replaceExtension(decoded, 'avif') : decoded;
    const safeName = toSafeFileName(original);
    const key = `${folder}/${uuid()}-${safeName}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentDisposition: `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(original)}`,
      }),
    );
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Chuyển ảnh sang AVIF để giảm dung lượng. Trả `null` khi tệp không phải ảnh
   * (PDF đính kèm) hoặc thuộc nhóm không nên đổi — lúc đó upload nguyên bản.
   * Encode hỏng cũng trả `null`: thà giữ tệp gốc còn hơn làm hỏng cả thao tác
   * lưu bài viết.
   */
  private async toAvif(file: Express.Multer.File): Promise<Buffer | null> {
    if (!file.mimetype.startsWith('image/')) return null;
    if (AVIF_SKIP_MIMES.has(file.mimetype)) return null;

    try {
      return await sharp(file.buffer)
        // Áp hướng xoay trong EXIF trước, vì AVIF xuất ra không giữ metadata.
        .rotate()
        .resize({ width: AVIF_MAX_WIDTH, withoutEnlargement: true })
        .avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT })
        .toBuffer();
    } catch (e) {
      this.logger.warn(
        `Không chuyển được "${file.originalname}" sang AVIF, giữ tệp gốc: ${e}`,
      );
      return null;
    }
  }

  async delete(url: string): Promise<void> {
    const key = url.split(`.amazonaws.com/`)[1];
    if (!key) return;
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
