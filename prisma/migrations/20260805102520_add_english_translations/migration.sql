-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "titleEn" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "nameEn" TEXT;

-- AlterTable
ALTER TABLE "ContentBlock" ADD COLUMN     "captionEn" TEXT,
ADD COLUMN     "contentEn" TEXT;
