-- Chú thích ảnh, chỉ dùng cho block IMAGE.
-- Nullable nên block cũ giữ nguyên, không cần backfill.
ALTER TABLE "ContentBlock" ADD COLUMN "caption" TEXT;
