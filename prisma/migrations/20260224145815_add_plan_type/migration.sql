/*
  Warnings:

  - Added the required column `expiresAt` to the `SubscriptionPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plan` to the `SubscriptionPlan` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "plan" "PlanType" NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cooldownUntil" TIMESTAMP(3);
