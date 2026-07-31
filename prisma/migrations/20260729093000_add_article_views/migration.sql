-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Article_status_views_idx" ON "Article"("status", "views");
