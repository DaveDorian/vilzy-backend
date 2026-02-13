-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'DRIVER', 'RESTAURANT_OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'ASSIGNED', 'PREPARING', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "idUser" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "ci" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idRestaurant" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("idUser")
);

-- CreateTable
CREATE TABLE "Restaurant" (
    "idRestaurant" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("idRestaurant")
);

-- CreateTable
CREATE TABLE "Product" (
    "idProduct" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "idRestaurant" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("idProduct")
);

-- CreateTable
CREATE TABLE "Order" (
    "idOrder" TEXT NOT NULL,
    "idClient" TEXT NOT NULL,
    "idRestaurant" TEXT NOT NULL,
    "idDriver" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "deliveryFee" DOUBLE PRECISION,
    "serviceFee" DOUBLE PRECISION,
    "discount" DOUBLE PRECISION,
    "deliveryLat" DOUBLE PRECISION NOT NULL,
    "deliveryLng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("idOrder")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "idOrderItem" TEXT NOT NULL,
    "idOrder" TEXT NOT NULL,
    "idProduct" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "priceAtPurchase" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("idOrderItem")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_ci_key" ON "User"("ci");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_idRestaurant_fkey" FOREIGN KEY ("idRestaurant") REFERENCES "Restaurant"("idRestaurant") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_idRestaurant_fkey" FOREIGN KEY ("idRestaurant") REFERENCES "Restaurant"("idRestaurant") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_idClient_fkey" FOREIGN KEY ("idClient") REFERENCES "User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_idRestaurant_fkey" FOREIGN KEY ("idRestaurant") REFERENCES "Restaurant"("idRestaurant") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_idDriver_fkey" FOREIGN KEY ("idDriver") REFERENCES "User"("idUser") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_idOrder_fkey" FOREIGN KEY ("idOrder") REFERENCES "Order"("idOrder") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_idProduct_fkey" FOREIGN KEY ("idProduct") REFERENCES "Product"("idProduct") ON DELETE RESTRICT ON UPDATE CASCADE;
