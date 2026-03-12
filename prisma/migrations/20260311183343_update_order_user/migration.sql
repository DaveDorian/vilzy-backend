-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_idCustomer_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "idCashier" TEXT,
ALTER COLUMN "idCustomer" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_idCustomer_fkey" FOREIGN KEY ("idCustomer") REFERENCES "User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_idCashier_fkey" FOREIGN KEY ("idCashier") REFERENCES "User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;
