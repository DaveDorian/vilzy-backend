/*
  Warnings:

  - Added the required column `pickupLat` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pickupLng` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "pickupLat" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "pickupLng" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "dispatchPriority" SET DEFAULT 0;
