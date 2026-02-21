/*
  Warnings:

  - You are about to drop the column `deliveryFee` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `serviceFee` on the `Order` table. All the data in the column will be lost.
  - Added the required column `commissionRate` to the `Tenant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idSubscriptionPlan` to the `Tenant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Tenant` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TenantType" AS ENUM ('MARKETPLACE', 'WHITE_LABEL');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('COMMISSION', 'SUBSCRIPTION_PAYMENT', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "deliveryFee",
DROP COLUMN "serviceFee",
ADD COLUMN     "commissionAmount" DOUBLE PRECISION,
ADD COLUMN     "driverEarning" DOUBLE PRECISION,
ADD COLUMN     "platformEarning" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "allowOwnDrivers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "commissionRate" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "idSubscriptionPlan" TEXT NOT NULL,
ADD COLUMN     "type" "TenantType" NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isShared" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "idSubscriptionPlan" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyPrice" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "allowWhiteLabel" BOOLEAN NOT NULL,
    "allowOwnDrivers" BOOLEAN NOT NULL,
    "dispatchPriority" INTEGER NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("idSubscriptionPlan")
);

-- CreateTable
CREATE TABLE "TenantTransaction" (
    "idTenantTransaction" TEXT NOT NULL,
    "idTenant" TEXT NOT NULL,
    "idOrder" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "TransactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantTransaction_pkey" PRIMARY KEY ("idTenantTransaction")
);

-- CreateIndex
CREATE INDEX "TenantTransaction_idTenant_idx" ON "TenantTransaction"("idTenant");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_idSubscriptionPlan_fkey" FOREIGN KEY ("idSubscriptionPlan") REFERENCES "SubscriptionPlan"("idSubscriptionPlan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantTransaction" ADD CONSTRAINT "TenantTransaction_idTenant_fkey" FOREIGN KEY ("idTenant") REFERENCES "Tenant"("idTenant") ON DELETE RESTRICT ON UPDATE CASCADE;
