-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "religions" TEXT[] DEFAULT ARRAY[]::TEXT[];
