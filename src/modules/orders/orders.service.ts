import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, customerId: string, dto: CreateOrderDto) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        idRestaurant: dto.idRestaurant,
        idTenant: tenantId,
      },
    });

    if (!restaurant)
      throw new ForbiddenException('Restaurant not foun in tenant');

    return this.prisma.order.create({
      data: {
        idRestaurant: dto.idRestaurant,
        deliveryFee: dto.deliveryFee,
        subtotal: dto.subtotal,
        total: dto.total,
        deliveryAddress: dto.deliveryAddress,
        deliveryLat: dto.deliveryLat!,
        deliveryLng: dto.deliveryLng!,
        idCustomer: customerId,
        idTenant: tenantId,
      },
    });
  }

  async findMyOrders(tenantId: string, userId: string) {
    return this.prisma.order.findMany({
      where: {
        idTenant: tenantId,
        idCustomer: userId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByRestaurant(tenantId: string, restaurantId: string) {
    return this.prisma.order.findMany({
      where: {
        idTenant: tenantId,
        idRestaurant: restaurantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async assignDriver(tenantId: string, orderId: string, driverId: string) {
    const order = await this.prisma.order.findFirst({
      where: { idOrder: orderId, idTenant: tenantId },
    });

    if (!order) throw new NotFoundException('Order not found');

    return this.prisma.order.update({
      where: { idOrder: orderId },
      data: {
        idDriver: driverId,
        status: 'ASSIGNED',
      },
    });
  }

  findAll() {
    return `This action returns all orders`;
  }

  findOne(id: number) {
    return `This action returns a #${id} order`;
  }

  update(id: number, updateOrderDto: UpdateOrderDto) {
    return `This action updates a #${id} order`;
  }

  remove(id: number) {
    return `This action removes a #${id} order`;
  }
}
