/*
  Warnings:

  - Added the required column `location` to the `DriverLocation` table without a default value. This is not possible if the table is not empty.

*/
CREATE EXTENSION IF NOT EXISTS postgis;

-- AlterTable
ALTER TABLE "DriverLocation" ADD COLUMN     "location" geometry(Point,4326) NOT NULL;

-- CreateIndex
CREATE INDEX "User_idTenant_isOnline_isAvailable_idx" ON "User"("idTenant", "isOnline", "isAvailable");
