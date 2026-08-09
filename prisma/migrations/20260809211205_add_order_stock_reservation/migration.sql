/*
  Warnings:

  - A unique constraint covering the columns `[orderId,productId,type]` on the table `ProductStockMovement` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StockMovementType" ADD VALUE 'ORDER_RESERVATION';
ALTER TYPE "StockMovementType" ADD VALUE 'ORDER_RESTORE';

-- DropForeignKey
ALTER TABLE "ProductStockMovement" DROP CONSTRAINT "ProductStockMovement_actorId_fkey";

-- AlterTable
ALTER TABLE "ProductStockMovement" ADD COLUMN     "orderId" TEXT,
ALTER COLUMN "actorId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ProductStockMovement_orderId_idx" ON "ProductStockMovement"("orderId");

-- CreateIndex
CREATE INDEX "ProductStockMovement_orderId_createdAt_idx" ON "ProductStockMovement"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductStockMovement_orderId_productId_type_key" ON "ProductStockMovement"("orderId", "productId", "type");

-- AddForeignKey
ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStockMovement" ADD CONSTRAINT "ProductStockMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
