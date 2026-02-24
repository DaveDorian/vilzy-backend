-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "lastDispatchAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'PENDING';
