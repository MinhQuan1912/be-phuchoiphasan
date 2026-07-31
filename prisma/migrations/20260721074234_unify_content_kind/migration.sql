/*
  Warnings:

  - You are about to drop the `Notice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NoticeBlock` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "CategoryKind" AS ENUM ('NEWS', 'NOTICE');

-- DropForeignKey
ALTER TABLE "NoticeBlock" DROP CONSTRAINT "NoticeBlock_noticeId_fkey";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "kind" "CategoryKind" NOT NULL DEFAULT 'NEWS';

-- DropTable
DROP TABLE "Notice";

-- DropTable
DROP TABLE "NoticeBlock";

-- DropEnum
DROP TYPE "NoticeType";

-- CreateIndex
CREATE INDEX "Category_kind_idx" ON "Category"("kind");
