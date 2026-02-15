/*
  Warnings:

  - You are about to drop the column `refresToken` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "refresToken",
ADD COLUMN     "refreshToken" TEXT;
