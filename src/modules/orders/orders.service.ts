import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RequestUser } from 'src/common/interfaces/request-user.interface';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { OrderStatus, Role } from '@prisma/client';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateOrderDto, user: RequestUser) {
    const { tenantId, sub, role } = user;
    const items = dto.items;

    let finalRestaurantId: string;
    let finalTenantId: string;

    if (role === Role.RESTAURANT_ADMIN || role === Role.RESTAURANT_CASHIER) {
      finalRestaurantId = user.restaurantId!;
      finalTenantId = tenantId;
    } else {
      if (!dto.restaurantId)
        throw new UnauthorizedException(
          'El ID de restaurante es obligatorio para clientes',
        );

      if (!dto.tenantId)
        throw new UnauthorizedException(
          'El ID de tenant es obligatorio para clientes',
        );
      finalRestaurantId = dto.restaurantId;
      finalTenantId = dto.tenantId;
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1️⃣ Traer productos del tenant
        const products = await tx.product.findMany({
          where: {
            idProduct: { in: items.map((i) => i.productId) },
            idRestaurant: finalRestaurantId,
            restaurant: { idTenant: finalTenantId },
          },
        });

        /*if (products.length !== dto.items.length) {
          throw new BadRequestException('Algunos productos no existen');
        }

        for (const item of items) {
          const product = products.find((p) => p.idProduct === item.productId);

          if (!product || product.stock! < item.quantity)
            throw new BadRequestException(
              `Stock insuficiente para el producto: ${product?.name || item.productId}`,
            );

          await tx.product.update({
            where: { idProduct: item.productId },
            data: {
              stock: { decrement: item.quantity },
            },
          });
        }*/

        /*const stockProducts = products.filter((p) => p.stock! > 0);
  
        if (stockProducts.length !== dto.items.length) {
          throw new BadRequestException('Algunos productos no tienen stock');
        }
  
        await tx.product.updateMany({
          where: {
            idProduct: { in: dto.items.map((i) => i.productId) },
            restaurant: { idTenant: tenantId },
          },
          data: {
            stock: {
              decrement: 1,
            },
          },
        });*/

        // 2️⃣ Calcular subtotal
        let subtotal = 0;

        items.forEach((item) => {
          const product = products.find((p) => p.idProduct === item.productId);
          subtotal += product!.price * item.quantity;
        });

        const commissionRate = 0.1;
        const commission = subtotal * commissionRate;
        const total = subtotal + commission;

        // 3️⃣ Crear orden
        const order = await tx.order.create({
          data: {
            idTenant: finalTenantId,
            idCustomer: dto.restaurantId ? sub : null,
            idUserCreated: sub,
            idRestaurant: finalRestaurantId,
            status: 'CREATED',
            subtotal,
            commissionAmount: commission,
            total,
            deliveryLat: 0,
            deliveryLng: 0,
            deliveryAddress: '',
          },
        });

        // 4️⃣ Crear order items
        await tx.orderItem.createMany({
          data: dto.items.map((item) => {
            const product = products.find(
              (p) => p.idProduct === item.productId,
            );

            return {
              idOrder: order.idOrder,
              idProduct: item.productId,
              quantity: item.quantity,
              priceAtPurchase: product!.price,
              nameAtPurchase: product!.name,
            };
          }),
        });

        return order;
      });
    } catch (error) {
      console.log(error);
    }
  }

  private validateTransition(current: OrderStatus, next: OrderStatus) {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      CREATED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
      READY: [OrderStatus.SEARCHING_DRIVER, OrderStatus.CANCELLED],
      SEARCHING_DRIVER: [
        OrderStatus.OFFERED_TO_DRIVER,
        OrderStatus.FAILED,
        OrderStatus.CANCELLED,
      ],
      OFFERED_TO_DRIVER: [OrderStatus.ASSIGNED, OrderStatus.SEARCHING_DRIVER],
      ASSIGNED: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
      PICKED_UP: [OrderStatus.DELIVERED, OrderStatus.FAILED],
      DELIVERED: [],
      CANCELLED: [],
      FAILED: [],
      PENDING: [],
      CONFIRMED: [],
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

    const updatedOrder = await this.prisma.order.update({
      where: { idOrder: orderId },
      data: { status: dto.status as OrderStatus },
      include: {
        restaurant: {
          select: {
            address: true,
            name: true,
            idTenant: true,
            lat: true,
            lng: true,
          },
        },
      },
    });

    if ((dto.status as OrderStatus) === 'READY') {
      this.eventEmitter.emit('order.ready', updatedOrder);
    }
    
    // Broadcast websocket change
    // Avoid double broadcasting created if we add that later, but everything else goes
    this.eventEmitter.emit('order.status_changed', {
       idOrder: updatedOrder.idOrder,
       status: updatedOrder.status
    });

    return updatedOrder;
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
      include: { driverProfile: true },
    });

    if (!driver) {
      throw new BadRequestException('Conductor no encontrado');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { idOrder: orderId },
      data: { idDriver: dto.driverId, status: 'ASSIGNED' as OrderStatus },
    });
    
    this.eventEmitter.emit('order.status_changed', {
       idOrder: updatedOrder.idOrder,
       status: updatedOrder.status,
       driver: {
          idDriver: driver.idUser,
          name: driver.name,
          vehiclePlate: driver.driverProfile?.vehiclePlate
       }
    });
    
    return updatedOrder;
  }

  async completeOrder(orderId: string, user: RequestUser) {
    const { tenantId, sub, role } = user;

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

    if (order.idDriver !== sub) {
      throw new ForbiddenException(
        'No puedes completar una orden que no te fue asignada',
      );
    }

    if (order.status !== 'ASSIGNED') {
      throw new BadRequestException(
        'Solo se pueden completar órdenes asignadas a un conductor',
      );
    }

    const updatedOrder = await this.prisma.order.update({
      where: { idOrder: orderId },
      data: { status: 'DELIVERED' as OrderStatus },
    });
    
    this.eventEmitter.emit('order.status_changed', {
       idOrder: updatedOrder.idOrder,
       status: updatedOrder.status
    });
    
    return updatedOrder;
  }

  async getMyOrders(user: RequestUser) {
    const { tenantId, sub, role } = user;

    if (role === Role.RESTAURANT_ADMIN || role === Role.RESTAURANT_CASHIER) {
      return await this.prisma.order.findMany({
        where: { idTenant: tenantId, idRestaurant: user.restaurantId },
        select: {
          idOrder: true,
          orderNumber: true,
          status: true,
          subtotal: true,
          total: true,
          deliveryAddress: true,
          deliveryLat: true,
          deliveryLng: true,

          items: {
            select: {
              idOrderItem: true,
              quantity: true,
              priceAtPurchase: true,
              nameAtPurchase: true,
            },
          },
        },
      });
    }

    if (role === Role.CUSTOMER) {
      return await this.prisma.order.findMany({
        where: { idTenant: tenantId, idCustomer: sub },
        include: { items: true },
      });
    }

    if (role === Role.DRIVER) {
      return await this.prisma.order.findMany({
        where: {
          idTenant: tenantId,
          OR: [{ idDriver: sub }, { status: 'READY' }],
        },
        include: { items: true },
      });
    } else {
      throw new ForbiddenException('Rol no autorizado para ver órdenes');
    }
  }

  async getOfferedOrders(user: RequestUser) {
    const { tenantId, role } = user;

    if (role !== Role.DRIVER) {
      throw new ForbiddenException('Rol no autorizado para ver órdenes');
    }

    return await this.prisma.order.findMany({
      where: { status: 'OFFERED_TO_DRIVER' , idTenant: tenantId},
      include: { items: true },
    });
  }

  async acceptOrder(orderId: string, user: RequestUser ) {
    const order = await this.prisma.order.findFirst({
      where: { idOrder: orderId, idTenant: user.tenantId },
    });

    if (!order) throw new ForbiddenException('Orden no encontrada');

    this.validateTransition(order.status, 'ASSIGNED');

    const updatedOrder = await this.prisma.order.update({
      where: { idOrder: orderId },
      data: {
        idDriver: user.sub,
        status: 'ASSIGNED',
      },
    });

    /*this.eventEmitter.emit('order.status_changed', {
       idOrder: updatedOrder.idOrder,
       status: updatedOrder.status
    });*/
    
    return updatedOrder;
  }
}
