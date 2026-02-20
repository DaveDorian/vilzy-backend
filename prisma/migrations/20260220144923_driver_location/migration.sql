/*
  Warnings:

  - The values [PENDING,ON_THE_WAY] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `idClient` on the `Order` table. All the data in the column will be lost.
  - Added the required column `deliveryAddress` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idCustomer` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idTenant` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('CREATED', 'CONFIRMED', 'PREPARING', 'READY', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED');
ALTER TABLE "public"."Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'CREATED';
COMMIT;

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_idClient_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "idClient",
ADD COLUMN     "deliveryAddress" TEXT NOT NULL,
ADD COLUMN     "idCustomer" TEXT NOT NULL,
ADD COLUMN     "idTenant" TEXT NOT NULL,
ADD COLUMN     "orderNumber" SERIAL NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'CREATED';

-- CreateTable
CREATE TABLE "DriverLocation" (
    "idDriverLocation" TEXT NOT NULL,
    "idDriver" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverLocation_pkey" PRIMARY KEY ("idDriverLocation")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverLocation_idDriver_key" ON "DriverLocation"("idDriver");

-- CreateIndex
CREATE INDEX "DriverLocation_lat_lng_idx" ON "DriverLocation"("lat", "lng");

-- CreateIndex
CREATE INDEX "Order_idTenant_idx" ON "Order"("idTenant");

-- CreateIndex
CREATE INDEX "Order_idRestaurant_idx" ON "Order"("idRestaurant");

-- CreateIndex
CREATE INDEX "Order_idDriver_idx" ON "Order"("idDriver");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_idCustomer_fkey" FOREIGN KEY ("idCustomer") REFERENCES "User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_idTenant_fkey" FOREIGN KEY ("idTenant") REFERENCES "Tenant"("idTenant") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverLocation" ADD CONSTRAINT "DriverLocation_idDriver_fkey" FOREIGN KEY ("idDriver") REFERENCES "User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;
