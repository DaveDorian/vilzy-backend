/*
  Warnings:

  - You are about to drop the column `idCashier` on the `Order` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_idCashier_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "idCashier",
ADD COLUMN     "idUserCreated" TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_idUserCreated_fkey" FOREIGN KEY ("idUserCreated") REFERENCES "User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;
