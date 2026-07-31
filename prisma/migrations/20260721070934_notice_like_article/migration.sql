/*
  Warnings:

  - You are about to drop the column `court` on the `Notice` table. All the data in the column will be lost.
  - You are about to drop the column `decisionNo` on the `Notice` table. All the data in the column will be lost.
  - You are about to drop the column `issuedAt` on the `Notice` table. All the data in the column will be lost.
  - You are about to drop the column `pdfUrl` on the `Notice` table. All the data in the column will be lost.
  - Added the required column `description` to the `Notice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `thumbnail` to the `Notice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Notice` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NoticeType" AS ENUM ('OPEN_PROCEEDING', 'DECLARE_BANKRUPTCY');

-- DropIndex
DROP INDEX "Notice_court_idx";

-- DropIndex
DROP INDEX "Notice_issuedAt_idx";

-- AlterTable
ALTER TABLE "Notice" DROP COLUMN "court",
DROP COLUMN "decisionNo",
DROP COLUMN "issuedAt",
DROP COLUMN "pdfUrl",
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "thumbnail" TEXT NOT NULL,
ADD COLUMN     "type" "NoticeType" NOT NULL;

-- CreateTable
CREATE TABLE "NoticeBlock" (
    "id" TEXT NOT NULL,
    "type" "BlockType" NOT NULL,
    "content" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL,
    "noticeId" TEXT NOT NULL,

    CONSTRAINT "NoticeBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoticeBlock_noticeId_idx" ON "NoticeBlock"("noticeId");

-- CreateIndex
CREATE INDEX "Notice_createdAt_idx" ON "Notice"("createdAt");

-- CreateIndex
CREATE INDEX "Notice_status_createdAt_idx" ON "Notice"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Notice_type_idx" ON "Notice"("type");

-- AddForeignKey
ALTER TABLE "NoticeBlock" ADD CONSTRAINT "NoticeBlock_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
