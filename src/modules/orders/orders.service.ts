import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private dispatchService: DispatchService,
    private queueService: QueueService,
  ) {}

  async createOrder(tenantId: string, customerId: string, dto: CreateOrderDto) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        idRestaurant: dto.idRestaurant,
        idTenant: tenantId,
      },
    });

    if (!restaurant)
      throw new ForbiddenException('Restaurant not foun in tenant');

    const order = await this.prisma.order.create({
      data: {
        idRestaurant: dto.idRestaurant,
        subtotal: dto.subtotal,
        total: dto.total,
        deliveryAddress: dto.deliveryAddress,
        deliveryLat: dto.deliveryLat!,
        deliveryLng: dto.deliveryLng!,
        pickupLat: dto.deliveryLat!,
        pickupLng: dto.deliveryLng!,
        idCustomer: customerId,
        idTenant: tenantId,
      },
      select: {
        idOrder: true,
        idTenant: true,
        tenant: {
          select: {
            subscriptionPlan: true,
          },
        },
      },
    });

    await this.queueService.getDispatchQueue().add('dispatch-order', {
      orderId: order.idOrder,
    });

    await this.queueService.getDispatchQueue().add(
      'redispatch-order',
      {
        orderId: order.idOrder,
      },
      { delay: 15000 },
    );

    /*const priority = 100 - order.tenant.subscriptionPlan.dispatchPriority;

    await this.dispatchQueue.add(
      'dispatch-order',
      {
        orderId: order.idOrder,
        tenantId: order.idTenant,
      },
      {
        priority,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: true,
      },
    );*/

    return order;
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

  async markReady(tenantId: string, orderId: string) {
    const order = await this.prisma.order.update({
      where: { idOrder: orderId },
      data: { status: 'READY' },
    });

    await this.dispatchService.autoAssignDriver(orderId, tenantId);

    return order;
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
