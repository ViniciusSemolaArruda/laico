-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Address_userId_archivedAt_idx" ON "Address"("userId", "archivedAt");

-- CreateIndex
CREATE INDEX "Address_userId_isDefault_idx" ON "Address"("userId", "isDefault");
