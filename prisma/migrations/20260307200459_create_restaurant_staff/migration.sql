-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'RESTAURANT_CASHIER';

-- CreateTable
CREATE TABLE "RestaurantStaff" (
    "idStaff" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "idRestaurant" TEXT NOT NULL,
    "canEditMenu" BOOLEAN NOT NULL DEFAULT false,
    "canViewReports" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestaurantStaff_pkey" PRIMARY KEY ("idStaff")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantStaff_idUser_key" ON "RestaurantStaff"("idUser");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantStaff_idRestaurant_key" ON "RestaurantStaff"("idRestaurant");

-- AddForeignKey
ALTER TABLE "RestaurantStaff" ADD CONSTRAINT "RestaurantStaff_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantStaff" ADD CONSTRAINT "RestaurantStaff_idRestaurant_fkey" FOREIGN KEY ("idRestaurant") REFERENCES "Restaurant"("idRestaurant") ON DELETE RESTRICT ON UPDATE CASCADE;
