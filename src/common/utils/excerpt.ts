/** Số ký tự tối đa của đoạn trích hiển thị ở danh sách bài viết. */
const EXCERPT_LENGTH = 220;

const HTML_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

/**
 * Cắt vài dòng đầu nội dung bài (HTML từ trình soạn thảo) thành đoạn trích
 * thuần văn bản — dùng thay cho mô tả ngắn ở các danh sách công khai.
 */
export function toExcerpt(html?: string, maxLength = EXCERPT_LENGTH): string {
  const text = (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, (e) => HTML_ENTITIES[e])
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxLength) return text;

  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
