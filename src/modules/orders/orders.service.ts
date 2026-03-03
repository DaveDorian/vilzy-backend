import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  CreateOrderDto,
  CancelOrderDto,
  ListOrdersQueryDto,
  OrderStatus,
  VALID_TRANSITIONS,
} from './dto/order.dto';
import { v4 as uuid } from 'uuid';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { RequestUser } from 'src/common/interfaces/request-user.interface';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatch: DispatchService,
  ) {}

  // ─── Crear pedido ───────────────────────────────────────────────────────────

  async create(dto: CreateOrderDto, user: RequestUser) {
    // 1. Verificar que el restaurant pertenece al mismo tenant
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        idRestaurant: dto.idRestaurant,
        idTenant: user.tenantId,
        isActive: true,
      },
    });
    if (!restaurant)
      throw new NotFoundException('Restaurant not found or inactive');

    // 2. Obtener productos y validar que pertenecen al restaurant
    const productIds = dto.items.map((i) => i.idProduct);
    const products = await this.prisma.product.findMany({
      where: { idProduct: { in: productIds }, idRestaurant: dto.idRestaurant },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException(
        'One or more products are invalid or do not belong to this restaurant',
      );
    }

    // 3. Construir mapa de productos para calcular precios
    const productMap = new Map(products.map((p: any) => [p.idProduct, p]));

    // 4. Calcular subtotal con el precio actual (priceAtPurchase lo congela)
    let subtotal = 0;
    const orderItems = dto.items.map((item) => {
      const product = productMap.get(item.idProduct)!;
      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;
      return {
        idOrderItem: uuid(),
        idProduct: item.idProduct,
        quantity: item.quantity,
        priceAtPurchase: product.price,
      };
    });

    const total = subtotal; // Aquí se pueden aplicar descuentos en el futuro

    // 5. Crear la orden con sus items en una transacción
    const order = await this.prisma.$transaction(async (tx) => {
      return tx.order.create({
        data: {
          idOrder: uuid(),
          idCustomer: user.idUser,
          idRestaurant: dto.idRestaurant,
          idTenant: user.tenantId,
          status: OrderStatus.PENDING,
          deliveryAddress: dto.deliveryAddress,
          deliveryLat: dto.deliveryLat,
          deliveryLng: dto.deliveryLng,
          customerLat: dto.customerLat,
          customerLng: dto.customerLng,
          pickupLat: restaurant.lat,
          pickupLng: restaurant.lng,
          subtotal,
          total,
          orderItem: { create: orderItems },
        },
        include: {
          orderItem: { include: { product: true } },
          restaurant: true,
        },
      });
    });

    this.logger.log(
      `Order created: ${order.idOrder} | tenant: ${user.tenantId}`,
    );

    // 6. Lanzar dispatch en background (no bloqueamos la respuesta al customer)
    this.dispatch
      .startDispatch(order.idOrder, user.tenantId)
      .catch((err) =>
        this.logger.error(
          `Dispatch failed for order ${order.idOrder}: ${err.message}`,
        ),
      );

    return order;
  }

  // ─── Listar pedidos del customer autenticado ────────────────────────────────

  async findMyOrders(user: RequestUser, query: ListOrdersQueryDto) {
    const { page, limit, status } = query;
    const skip = (page! - 1) * limit!;

    const where = {
      idCustomer: user.idUser,
      idTenant: user.tenantId,
      ...(status && { status }),
    };

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orderItem: { include: { product: true } },
          restaurant: { select: { name: true, address: true } },
          driver: { select: { name: true, surname: true, rating: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit };
  }

  // ─── Listar pedidos por restaurant (para RESTAURANT_ADMIN) ─────────────────

  async findByRestaurant(
    idRestaurant: string,
    user: RequestUser,
    query: ListOrdersQueryDto,
  ) {
    // Verificar que el admin pertenece a ese restaurant
    if (user.role === 'RESTAURANT_ADMIN') {
      const isOwner = await this.prisma.user.findFirst({
        where: { idUser: user.idUser, idRestaurant },
      });
      if (!isOwner)
        throw new ForbiddenException('You do not manage this restaurant');
    }

    const { page, limit, status } = query;
    const skip = (page! - 1) * limit!;

    const where = {
      idRestaurant,
      idTenant: user.tenantId,
      ...(status && { status }),
    };

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orderItem: { include: { product: true } },
          customer: { select: { name: true, surname: true } },
          driver: { select: { name: true, surname: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit };
  }

  // ─── Listar pedidos del driver autenticado ──────────────────────────────────

  async findMyDriverOrders(user: RequestUser, query: ListOrdersQueryDto) {
    const { page, limit, status } = query;
    const skip = (page! - 1) * limit!;

    const where = {
      idDriver: user.idUser,
      idTenant: user.tenantId,
      ...(status && { status }),
    };

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orderItem: { include: { product: true } },
          restaurant: {
            select: { name: true, address: true, lat: true, lng: true },
          },
          customer: { select: { name: true, surname: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit };
  }

  // ─── Listar todos los pedidos del tenant (TENANT_ADMIN / SUPER_ADMIN) ───────

  async findByTenant(user: RequestUser, query: ListOrdersQueryDto) {
    const { page, limit, status } = query;
    const skip = (page! - 1) * limit!;

    const where = {
      idTenant: user.tenantId,
      ...(status && { status }),
    };

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          restaurant: { select: { name: true } },
          customer: { select: { name: true, surname: true } },
          driver: { select: { name: true, surname: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit };
  }

  // ─── Obtener detalle de un pedido ───────────────────────────────────────────

  async findOne(idOrder: string, user: RequestUser) {
    const order = await this.prisma.order.findFirst({
      where: { idOrder, idTenant: user.tenantId },
      include: {
        orderItem: { include: { product: true } },
        restaurant: true,
        customer: { select: { name: true, surname: true, email: true } },
        driver: {
          select: { name: true, surname: true, rating: true, fcmToken: true },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    // Customers solo pueden ver sus propios pedidos
    if (user.role === 'CUSTOMER' && order.idCustomer !== user.idUser) {
      throw new ForbiddenException('Access denied');
    }

    // Drivers solo pueden ver sus pedidos asignados
    if (user.role === 'DRIVER' && order.idDriver !== user.idUser) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }

  // ─── Cancelar pedido ────────────────────────────────────────────────────────

  async cancel(idOrder: string, dto: CancelOrderDto, user: RequestUser) {
    const order = await this.prisma.order.findFirst({
      where: { idOrder, idTenant: user.tenantId },
    });

    if (!order) throw new NotFoundException('Order not found');

    // Solo el customer dueño o un admin pueden cancelar
    const isOwner = order.idCustomer === user.idUser;
    const isAdmin = ['TENANT_ADMIN', 'SUPER_ADMIN'].includes(user.role);
    if (!isOwner && !isAdmin)
      throw new ForbiddenException('You cannot cancel this order');

    // Validar que la transición a CANCELLED es posible desde el estado actual
    const allowedNext = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowedNext.includes(OrderStatus.CANCELLED)) {
      throw new BadRequestException(
        `Cannot cancel an order with status "${order.status}"`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { idOrder },
      data: { status: OrderStatus.CANCELLED },
    });

    this.logger.log(
      `Order cancelled: ${idOrder} by user ${user.idUser} | reason: ${dto.reason ?? 'none'}`,
    );

    return updated;
  }

  // ─── Método interno: actualizar estado (usado por DispatchService) ──────────

  async updateStatus(
    idOrder: string,
    newStatus: OrderStatus,
    extra?: Partial<{
      idDriver: string;
      offerExpiresAt: Date;
      offeredDriverId: string;
      lastDispatchAt: Date;
      dispatchAttempts: number;
    }>,
  ) {
    return this.prisma.order.update({
      where: { idOrder },
      data: { status: newStatus, ...extra },
    });
  }
}
