/**
 * Chuyển chuỗi tiếng Việt có dấu thành slug URL.
 *   "Sửa đổi Luật Phá sản 2014" → "sua-doi-luat-pha-san-2014"
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD') // tách dấu ra khỏi chữ cái
    .replace(/[̀-ͯ]/g, '') // rồi bỏ dấu
    .replace(/[đĐ]/g, 'd') // đ/Đ không tách được bằng NFD nên xử lý riêng
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, ''); // cắt 80 ký tự có thể để lại '-' ở cuối
}

/**
 * Slug rỗng (tiêu đề toàn ký tự lạ) thì rơi về giá trị mặc định.
 */
export function slugifyOrDefault(input: string, fallback = 'bai-viet'): string {
  return slugify(input) || fallback;
}
