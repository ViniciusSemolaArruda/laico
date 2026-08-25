-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('STANDARD', 'ACCESSORY', 'RELIGIOUS_IMAGE', 'CLOTHING_TOP', 'CLOTHING_BOTTOM');

-- CreateEnum
CREATE TYPE "ClothingSize" AS ENUM ('P', 'M', 'G', 'GG', 'XG');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "materialComposition" TEXT,
ADD COLUMN     "productType" "ProductType" NOT NULL DEFAULT 'STANDARD';

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "size" "ClothingSize" NOT NULL,
    "sku" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minimumStock" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "pieceLength" DECIMAL(10,2),
    "sleeveLength" DECIMAL(10,2),
    "shoulderWidth" DECIMAL(10,2),
    "chestCircumference" DECIMAL(10,2),
    "waistCircumference" DECIMAL(10,2),
    "hipCircumference" DECIMAL(10,2),
    "thighCircumference" DECIMAL(10,2),
    "inseamLength" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE INDEX "ProductVariant_size_idx" ON "ProductVariant"("size");

-- CreateIndex
CREATE INDEX "ProductVariant_active_idx" ON "ProductVariant"("active");

-- CreateIndex
CREATE INDEX "ProductVariant_stock_idx" ON "ProductVariant"("stock");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_active_idx" ON "ProductVariant"("productId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_size_key" ON "ProductVariant"("productId", "size");

-- CreateIndex
CREATE INDEX "Product_productType_idx" ON "Product"("productType");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
