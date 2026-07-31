-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_order_idx" ON "Category"("order");

-- Seed 5 chuyên mục mặc định (id cố định để migration lặp lại vẫn cho kết quả như nhau)
INSERT INTO "Category" ("id", "name", "slug", "order", "createdAt", "updatedAt") VALUES
    ('11111111-1111-4111-8111-000000000001', 'Thời sự',      'thoi-su',      1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('11111111-1111-4111-8111-000000000002', 'Pháp luật',    'phap-luat',    2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('11111111-1111-4111-8111-000000000003', 'Doanh nghiệp', 'doanh-nghiep', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('11111111-1111-4111-8111-000000000004', 'Phân tích',    'phan-tich',    4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('11111111-1111-4111-8111-000000000005', 'Hỏi đáp',      'hoi-dap',      5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable: thêm status, giữ nguyên ý nghĩa dữ liệu cũ
ALTER TABLE "Article" ADD COLUMN "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT';

-- Backfill: isPublished=true → PUBLISHED, false → DRAFT (đã là mặc định)
UPDATE "Article" SET "status" = 'PUBLISHED' WHERE "isPublished" = true;

-- AlterTable: thêm categoryId dạng nullable trước để backfill được bài viết cũ
ALTER TABLE "Article" ADD COLUMN "categoryId" TEXT;

-- Backfill: bài viết cũ chưa có chuyên mục → gán mặc định "Pháp luật"
UPDATE "Article" SET "categoryId" = '11111111-1111-4111-8111-000000000002' WHERE "categoryId" IS NULL;

-- Backfill xong mới siết NOT NULL
ALTER TABLE "Article" ALTER COLUMN "categoryId" SET NOT NULL;

-- Bỏ cột/index cũ sau khi dữ liệu đã chuyển sang status
DROP INDEX "Article_isPublished_createdAt_idx";
ALTER TABLE "Article" DROP COLUMN "isPublished";

-- CreateIndex
CREATE INDEX "Article_status_createdAt_idx" ON "Article"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Article_categoryId_idx" ON "Article"("categoryId");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
