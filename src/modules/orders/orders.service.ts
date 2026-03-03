import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RequestUser } from 'src/common/interfaces/request-user.interface';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { OrderStatus, Role } from 'src/generated/prisma/enums';
import { AssignDriverDto } from './dto/assign-driver.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto, user: RequestUser) {
    const { tenantId, idUser: customerId } = user;

    return await this.prisma.$transaction(async (tx) => {
      // 1️⃣ Traer productos del tenant
      const products = await tx.product.findMany({
        where: {
          idProduct: { in: dto.items.map((i) => i.idProduct) },
          restaurant: { idTenant: tenantId },
        },
      });

      if (products.length !== dto.items.length) {
        throw new BadRequestException('Algunos productos no existen');
      }

      const stockProducts = products.filter((p) => p.stock! > 0);

      if (stockProducts.length !== dto.items.length) {
        throw new BadRequestException('Algunos productos no tienen stock');
      }

      await tx.product.updateMany({
        where: {
          idProduct: { in: dto.items.map((i) => i.idProduct) },
          restaurant: { idTenant: tenantId },
        },
        data: {
          stock: {
            decrement: 1,
          },
        },
      });

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
      const order = await tx.order.create({
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
      await tx.orderItem.createMany({
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
    });
  }

  private validateTransition(current: OrderStatus, next: OrderStatus) {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PREPARING: [],
      CREATED: [OrderStatus.PENDING],
      PENDING: [OrderStatus.CONFIRMED],
      CONFIRMED: [OrderStatus.READY],
      READY: [OrderStatus.ASSIGNED],
      ASSIGNED: [OrderStatus.DELIVERED],
      SEARCHING_DRIVER: [],
      OFFERED_TO_DRIVER: [],
      PICKED_UP: [],
      DELIVERED: [],
      CANCELLED: [],
      FAILED: [],
    };

    if (!validTransitions[current].includes(next)) {
      throw new BadRequestException(
        `Transición inválida de ${current} a ${next}`,
      );
    }
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

    this.validateTransition(order.status, dto.status as OrderStatus);

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
        idDriver: null,
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

  async completeOrder(orderId: string, user: RequestUser) {
    const { tenantId, idUser, role } = user;

    if (role !== 'DRIVER') {
      throw new ForbiddenException(
        'Solo los conductores pueden completar órdenes',
      );
    }

    const order = await this.prisma.order.findUnique({
      where: {
        idOrder: orderId,
        idTenant: tenantId,
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.idDriver !== idUser) {
      throw new ForbiddenException(
        'No puedes completar una orden que no te fue asignada',
      );
    }

    if (order.status !== 'ASSIGNED') {
      throw new BadRequestException(
        'Solo se pueden completar órdenes asignadas a un conductor',
      );
    }

    return await this.prisma.order.update({
      where: { idOrder: orderId },
      data: { status: 'DELIVERED' as OrderStatus },
    });
  }

  async getMyOrders(user: RequestUser) {
    const { tenantId, idUser, role } = user;

    if (role === Role.RESTAURANT_ADMIN) {
      return await this.prisma.order.findMany({
        where: { idTenant: tenantId },
        include: { orderItem: true },
      });
    }

    if (role === Role.CUSTOMER) {
      return await this.prisma.order.findMany({
        where: { idTenant: tenantId, idCustomer: idUser },
        include: { orderItem: true },
      });
    }

    if (role === Role.DRIVER) {
      return await this.prisma.order.findMany({
        where: {
          idTenant: tenantId,
          OR: [{ idDriver: idUser }, { status: 'READY' }],
        },
        include: { orderItem: true },
      });
    } else {
      throw new ForbiddenException('Rol no autorizado para ver órdenes');
    }
  }
}
