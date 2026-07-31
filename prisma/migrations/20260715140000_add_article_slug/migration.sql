-- Thêm slug dạng nullable trước để backfill được bài viết cũ
ALTER TABLE "Article" ADD COLUMN "slug" TEXT;

-- Backfill slug từ tiêu đề:
--   lower() → translate() bỏ dấu tiếng Việt (kể cả đ→d)
--   → mọi ký tự không phải [a-z0-9] thành '-' → gộp '-' liên tiếp → cắt '-' ở hai đầu
-- Tiêu đề trùng nhau thì bài thứ 2 trở đi được thêm hậu tố -2, -3...
WITH slugged AS (
    SELECT
        "id",
        "createdAt",
        NULLIF(
            trim(both '-' from regexp_replace(
                translate(
                    lower("title"),
                    'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ',
                    'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
                ),
                '[^a-z0-9]+', '-', 'g'
            )),
            ''
        ) AS base
    FROM "Article"
),
numbered AS (
    SELECT
        "id",
        COALESCE("base", 'bai-viet') AS base,
        row_number() OVER (
            PARTITION BY COALESCE("base", 'bai-viet')
            ORDER BY "createdAt", "id"
        ) AS rn
    FROM slugged
)
UPDATE "Article" a
SET "slug" = n.base || CASE WHEN n.rn = 1 THEN '' ELSE '-' || n.rn::text END
FROM numbered n
WHERE a."id" = n."id";

-- Backfill xong mới siết NOT NULL
ALTER TABLE "Article" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");
