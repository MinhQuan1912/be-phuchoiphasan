import { slugifyOrDefault } from './slugify';

/**
 * Multer/busboy đọc tên tệp trong header multipart theo **latin1**, nên tên tiếng Việt
 * gửi lên dạng UTF-8 sẽ thành ký tự lạ ("hình ảnh.png" → "hÃ¬nh áº£nh.png").
 * Đọc lại đúng byte rồi giải mã UTF-8 để lấy tên gốc. Tên thuần ASCII không đổi.
 */
export function decodeOriginalName(name: string): string {
  return Buffer.from(name, 'latin1').toString('utf8');
}

/**
 * Tên dùng cho key trên S3: bỏ dấu, chỉ còn a-z0-9- và giữ phần mở rộng.
 * Key có ký tự Unicode vẫn chạy được nhưng bất kỳ chỗ nào ghép URL mà quên
 * encode là hỏng, nên chuẩn hóa ngay từ đầu.
 *   "Quyết định số 12.pdf" → "quyet-dinh-so-12.pdf"
 */
export function toSafeFileName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const slug = slugifyOrDefault(base, 'tep');
  return ext ? `${slug}.${ext}` : slug;
}
