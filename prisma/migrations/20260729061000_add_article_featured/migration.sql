-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Article_status_featured_idx" ON "Article"("status", "featured");
