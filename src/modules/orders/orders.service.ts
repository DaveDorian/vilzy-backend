import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RequestUser } from 'src/common/interfaces/request-user.interface';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { OrderStatus } from 'src/generated/prisma/enums';
import { AssignDriverDto } from './dto/assign-driver.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto, user: RequestUser) {
    const { tenantId, idUser: customerId } = user;

    // 1️⃣ Traer productos del tenant
    const products = await this.prisma.product.findMany({
      where: {
        idProduct: { in: dto.items.map((i) => i.idProduct) },
        restaurant: { idTenant: tenantId },
      },
    });

    if (products.length !== dto.items.length) {
      throw new BadRequestException('Algunos productos no existen');
    }

    // 2️⃣ Calcular subtotal
    let subtotal = 0;

    dto.items.forEach((item) => {
      const product = products.find((p) => p.idProduct === item.idProduct);
      subtotal += product!.price * item.quantity;
    });

    const commissionRate = 0.1;
    const commission = subtotal * commissionRate;
    const total = subtotal + commission;

    // 3️⃣ Crear orden
    const order = await this.prisma.order.create({
      data: {
        idTenant: tenantId,
        idCustomer: customerId,
        idRestaurant: products[0].idRestaurant,
        status: 'PENDING',
        subtotal,
        commissionAmount: commission,
        total,
        pickupLat: 0,
        pickupLng: 0,
        deliveryLat: 0,
        deliveryLng: 0,
        deliveryAddress: '',
      },
    });

    // 4️⃣ Crear order items
    await this.prisma.orderItem.createMany({
      data: dto.items.map((item) => {
        const product = products.find((p) => p.idProduct === item.idProduct);

        return {
          idOrder: order.idOrder,
          idProduct: item.idProduct,
          quantity: item.quantity,
          priceAtPurchase: product!.price,
        };
      }),
    });

    return order;
  }

  async changeStatus(
    orderId: string,
    dto: ChangeOrderStatusDto,
    user: RequestUser,
  ) {
    const { tenantId } = user;

    const order = await this.prisma.order.findUnique({
      where: {
        idOrder: orderId,
        idTenant: tenantId,
      },
    });

    if (!order) {
      throw new BadRequestException('Orden no encontrada');
    }

    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      throw new BadRequestException(
        'No se puede cambiar el estado de una orden entregada o cancelada',
      );
    }

    return await this.prisma.order.update({
      where: { idOrder: orderId },
      data: { status: dto.status as OrderStatus },
    });
  }

  async assignDriver(orderId: string, dto: AssignDriverDto, user: RequestUser) {
    const { tenantId } = user;

    const order = await this.prisma.order.findUnique({
      where: {
        idOrder: orderId,
        idTenant: tenantId,
      },
    });

    if (!order) {
      throw new BadRequestException('Orden no encontrada');
    }

    if (order.status !== 'READY' && order.status !== 'CONFIRMED') {
      throw new BadRequestException(
        'Solo se pueden asignar conductores a órdenes listas o en camino',
      );
    }

    const driver = await this.prisma.user.findUnique({
      where: { idUser: dto.driverId, idTenant: tenantId, role: 'DRIVER' },
    });

    if (!driver) {
      throw new BadRequestException('Conductor no encontrado');
    }

    return await this.prisma.order.update({
      where: { idOrder: orderId },
      data: { idDriver: dto.driverId, status: 'ASSIGNED' as OrderStatus },
    });
  }
}
