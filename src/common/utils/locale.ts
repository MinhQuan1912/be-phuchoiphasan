/**
 * Ngôn ngữ hiển thị của site công khai. Tiếng Việt là bản gốc và luôn có;
 * tiếng Anh là bản dịch tùy chọn do admin nhập thêm.
 */
export type Locale = 'vi' | 'en';

/** Đọc `?lang=` từ query. Giá trị lạ hoặc thiếu đều coi như tiếng Việt. */
export function parseLocale(raw?: string): Locale {
  return raw?.toLowerCase() === 'en' ? 'en' : 'vi';
}

/**
 * Chọn nội dung theo ngôn ngữ, thiếu bản dịch thì lùi về bản gốc tiếng Việt.
 * Chuỗi rỗng/toàn khoảng trắng coi như chưa dịch.
 */
export function pickText(
  locale: Locale,
  vi: string,
  en?: string | null,
): string {
  if (locale === 'en' && en?.trim()) return en;
  return vi;
}

/** Như `pickText` nhưng cho trường có thể null (caption). */
export function pickNullableText(
  locale: Locale,
  vi: string | null,
  en?: string | null,
): string | null {
  if (locale === 'en' && en?.trim()) return en;
  return vi;
}

/** Có bản dịch dùng được hay không (dùng để gắn nhãn "chưa có bản tiếng Anh"). */
export function hasTranslation(en?: string | null): boolean {
  return !!en?.trim();
}
