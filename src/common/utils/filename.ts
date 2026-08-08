import { slugifyOrDefault } from './slugify';

export function decodeOriginalName(name: string): string {
  return Buffer.from(name, 'latin1').toString('utf8');
}

/**
 * Đổi phần mở rộng của tên tệp, dùng khi ảnh được chuyển sang định dạng khác
 * lúc upload ("bia-bai-viet.png" → "bia-bai-viet.avif"). Tên không có phần mở
 * rộng thì được thêm vào.
 */
export function replaceExtension(name: string, ext: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.${ext}`;
}

export function toSafeFileName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext =
    dot > 0
      ? name
          .slice(dot + 1)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
      : '';
  const slug = slugifyOrDefault(base, 'tep');
  return ext ? `${slug}.${ext}` : slug;
}
