/*
  Warnings:

  - Added the required column `idTenant` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idTenant` to the `Restaurant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idTenant` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "idTenant" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "idTenant" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "idTenant" TEXT NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'CLIENT';

-- CreateTable
CREATE TABLE "Tenant" (
    "idTenant" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("idTenant")
);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_idTenant_fkey" FOREIGN KEY ("idTenant") REFERENCES "Tenant"("idTenant") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_idTenant_fkey" FOREIGN KEY ("idTenant") REFERENCES "Tenant"("idTenant") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_idTenant_fkey" FOREIGN KEY ("idTenant") REFERENCES "Tenant"("idTenant") ON DELETE RESTRICT ON UPDATE CASCADE;
