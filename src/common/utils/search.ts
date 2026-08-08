import { Prisma } from '@prisma/client';

// Bảng bỏ dấu tiếng Việt cho translate() của Postgres — giữ trùng khớp với
// migration 20260715140000_add_article_slug.
const VN_ACCENTED =
  'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ';
const VN_PLAIN =
  'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd';

/**
 * Chuẩn hóa từ khóa người dùng gõ về dạng không dấu, chữ thường.
 *   "Phá Sản" → "pha san"
 */
export function normalizeSearch(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

/**
 * Escape các ký tự có nghĩa đặc biệt trong LIKE, để người dùng gõ '%' hay '_'
 * thì đó là ký tự thường chứ không phải wildcard.
 */
function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Điều kiện SQL: cột `column` sau khi bỏ dấu + hạ chữ thường có chứa `keyword`
 * (cũng đã bỏ dấu). Nhờ vậy gõ "pha san" tìm được "Phá sản".
 *
 * Chỉ xử lý dấu tiếng Việt: tiêu đề tiếng nước ngoài như "café" phải gõ đúng dấu.
 */
export function unaccentedContains(
  column: Prisma.Sql,
  keyword: string,
): Prisma.Sql {
  const needle = `%${escapeLike(normalizeSearch(keyword))}%`;
  return Prisma.sql`translate(lower(${column}), ${VN_ACCENTED}, ${VN_PLAIN}) LIKE ${needle}`;
}
