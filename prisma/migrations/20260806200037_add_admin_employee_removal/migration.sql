-- AlterTable
ALTER TABLE "AdminProfile" ADD COLUMN     "removedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "AdminProfile_removedAt_idx" ON "AdminProfile"("removedAt");
