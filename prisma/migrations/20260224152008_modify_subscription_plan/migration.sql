/*
  Warnings:

  - You are about to drop the column `idSubscriptionPlan` on the `Tenant` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[idTenant]` on the table `SubscriptionPlan` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `idTenant` to the `SubscriptionPlan` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Tenant" DROP CONSTRAINT "Tenant_idSubscriptionPlan_fkey";

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "idTenant" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "idSubscriptionPlan";

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_idTenant_key" ON "SubscriptionPlan"("idTenant");

-- AddForeignKey
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_idTenant_fkey" FOREIGN KEY ("idTenant") REFERENCES "Tenant"("idTenant") ON DELETE RESTRICT ON UPDATE CASCADE;
