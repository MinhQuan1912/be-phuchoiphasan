-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "targetKind" "CategoryKind";

-- CreateIndex
CREATE INDEX "ActivityLog_adminId_idx" ON "ActivityLog"("adminId");

-- CreateIndex
CREATE INDEX "ActivityLog_targetKind_idx" ON "ActivityLog"("targetKind");
