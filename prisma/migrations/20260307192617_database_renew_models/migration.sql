/*
  Warnings:

  - You are about to drop the column `customerLat` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `customerLng` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `dispatchAttempts` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `lastDispatchAt` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `offerExpiresAt` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `offeredDriverId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `pickupLat` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `pickupLng` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `acceptanceRate` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `cooldownUntil` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `idRestaurant` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isAvailable` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isOnline` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isShared` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionCount` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[idOwner]` on the table `Restaurant` will be added. If there are existing duplicate values, this will fail.
  - Made the column `discount` on table `Order` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `nameAtPurchase` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idCategory` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('SENT', 'REJECTED', 'EXPIRED', 'ACCEPTED');

-- DropForeignKey
ALTER TABLE "DriverLocation" DROP CONSTRAINT "DriverLocation_idDriver_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_idDriver_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_idRestaurant_fkey";

-- DropIndex
DROP INDEX "DriverLocation_lat_lng_idx";

-- DropIndex
DROP INDEX "Order_idTenant_idx";

-- DropIndex
DROP INDEX "User_idTenant_isOnline_isAvailable_idx";

-- AlterTable
ALTER TABLE "DriverLocation" ADD COLUMN     "heading" DOUBLE PRECISION,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "speed" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "customerLat",
DROP COLUMN "customerLng",
DROP COLUMN "dispatchAttempts",
DROP COLUMN "lastDispatchAt",
DROP COLUMN "offerExpiresAt",
DROP COLUMN "offeredDriverId",
DROP COLUMN "pickupLat",
DROP COLUMN "pickupLng",
ADD COLUMN     "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "discount" SET NOT NULL,
ALTER COLUMN "discount" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "nameAtPurchase" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "description" TEXT,
ADD COLUMN     "idCategory" TEXT NOT NULL,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "idOwner" TEXT,
ADD COLUMN     "location" geometry(Point,4326);

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "slug" TEXT,
ALTER COLUMN "commissionRate" SET DEFAULT 0.10;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "acceptanceRate",
DROP COLUMN "cooldownUntil",
DROP COLUMN "idRestaurant",
DROP COLUMN "isAvailable",
DROP COLUMN "isOnline",
DROP COLUMN "isShared",
DROP COLUMN "rating",
DROP COLUMN "rejectionCount";

-- CreateTable
CREATE TABLE "DriverProfile" (
    "idDriver" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isShared" BOOLEAN NOT NULL DEFAULT true,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "acceptanceRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "rejectionCount" INTEGER NOT NULL DEFAULT 0,
    "cooldownUntil" TIMESTAMP(3),
    "fcmToken" TEXT,
    "vehiclePlate" TEXT,
    "vehicleType" TEXT,
    "location" geometry(Point,4326),

    CONSTRAINT "DriverProfile_pkey" PRIMARY KEY ("idDriver")
);

-- CreateTable
CREATE TABLE "OrderOffer" (
    "idOrderOffer" TEXT NOT NULL,
    "idOrder" TEXT NOT NULL,
    "idDriver" TEXT NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderOffer_pkey" PRIMARY KEY ("idOrderOffer")
);

-- CreateTable
CREATE TABLE "Category" (
    "idCategory" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "idRestaurant" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("idCategory")
);

-- CreateIndex
CREATE INDEX "OrderOffer_idOrder_status_idx" ON "OrderOffer"("idOrder", "status");

-- CreateIndex
CREATE INDEX "DriverLocation_location_idx" ON "DriverLocation" USING GIST ("location");

-- CreateIndex
CREATE INDEX "Order_idTenant_status_idx" ON "Order"("idTenant", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_idOwner_key" ON "Restaurant"("idOwner");

-- CreateIndex
CREATE INDEX "Restaurant_idTenant_idx" ON "Restaurant"("idTenant");

-- CreateIndex
CREATE INDEX "User_idTenant_role_idx" ON "User"("idTenant", "role");

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_idDriver_fkey" FOREIGN KEY ("idDriver") REFERENCES "User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderOffer" ADD CONSTRAINT "OrderOffer_idOrder_fkey" FOREIGN KEY ("idOrder") REFERENCES "Order"("idOrder") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderOffer" ADD CONSTRAINT "OrderOffer_idDriver_fkey" FOREIGN KEY ("idDriver") REFERENCES "DriverProfile"("idDriver") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_idOwner_fkey" FOREIGN KEY ("idOwner") REFERENCES "User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_idRestaurant_fkey" FOREIGN KEY ("idRestaurant") REFERENCES "Restaurant"("idRestaurant") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_idCategory_fkey" FOREIGN KEY ("idCategory") REFERENCES "Category"("idCategory") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_idDriver_fkey" FOREIGN KEY ("idDriver") REFERENCES "DriverProfile"("idDriver") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverLocation" ADD CONSTRAINT "DriverLocation_idDriver_fkey" FOREIGN KEY ("idDriver") REFERENCES "DriverProfile"("idDriver") ON DELETE RESTRICT ON UPDATE CASCADE;
