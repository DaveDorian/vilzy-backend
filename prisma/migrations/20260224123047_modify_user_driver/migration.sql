-- AlterTable
ALTER TABLE "User" ADD COLUMN     "acceptanceRate" DOUBLE PRECISION DEFAULT 1,
ADD COLUMN     "rejectionCount" INTEGER DEFAULT 0;
