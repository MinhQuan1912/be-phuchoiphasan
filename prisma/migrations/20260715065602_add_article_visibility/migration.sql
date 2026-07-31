-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Article_isPublished_createdAt_idx" ON "Article"("isPublished", "createdAt");
