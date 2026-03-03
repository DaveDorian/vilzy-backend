import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { DispatchService } from '../dispatch/dispatch.service';
import { OrdersGateway } from '../gateway/orders.gateway';
import {
  RejectOfferDto,
  UpdateOrderStatusDto,
  DriverOrderTransition,
} from './dto/driver-response.dto';
import { OrderStatus } from '../orders/dto/order.dto';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { RequestUser } from 'src/common/interfaces/request-user.interface';

// Transiciones permitidas para el driver y su estado anterior requerido
const DRIVER_TRANSITIONS: Record<DriverOrderTransition, OrderStatus> = {
  [DriverOrderTransition.PICKED_UP]: OrderStatus.CONFIRMED,
  [DriverOrderTransition.DELIVERED]: OrderStatus.PICKED_UP,
};

@Injectable()
export class DriverResponseService {
  private readonly logger = new Logger(DriverResponseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatch: DispatchService,
    private readonly gateway: OrdersGateway,
  ) {}

  // ─── Ver oferta activa pendiente ────────────────────────────────────────────

  async getPendingOffer(user: RequestUser) {
    const order = await this.prisma.order.findFirst({
      where: {
        offeredDriverId: user.idUser,
        idTenant: user.tenantId,
        status: OrderStatus.OFFERED_TO_DRIVER,
      },
      include: {
        restaurant: {
          select: { name: true, address: true, lat: true, lng: true },
        },
        orderItem: {
          include: { product: { select: { name: true, price: true } } },
        },
      },
    });

    if (!order) {
      return null; // No hay oferta pendiente — respuesta 200 con data: null
    }

    // Verificar que la oferta no expiró mientras tanto
    if (order.offerExpiresAt && new Date() > order.offerExpiresAt) {
      return null;
    }

    return {
      idOrder: order.idOrder,
      restaurant: order.restaurant,
      deliveryAddress: order.deliveryAddress,
      deliveryLat: order.deliveryLat,
      deliveryLng: order.deliveryLng,
      total: order.total,
      itemCount: order.orderItem.length,
      items: order.orderItem,
      offerExpiresAt: order.offerExpiresAt,
      // Segundos restantes para que el frontend muestre un countdown
      secondsRemaining: order.offerExpiresAt
        ? Math.max(
            0,
            Math.floor((order.offerExpiresAt.getTime() - Date.now()) / 1000),
          )
        : null,
    };
  }

  // ─── Aceptar oferta ─────────────────────────────────────────────────────────

  async acceptOffer(idOrder: string, user: RequestUser) {
    // Delegar completamente al DispatchService (misma lógica que WS)
    const accepted = await this.dispatch.acceptOffer(idOrder, user.idUser);

    if (!accepted) {
      // Distinguir entre "no era tu oferta" y "ya expiró"
      const order = await this.prisma.order.findFirst({
        where: { idOrder, idTenant: user.tenantId },
      });

      if (!order) throw new NotFoundException('Order not found');

      if (order.offeredDriverId !== user.idUser) {
        throw new ForbiddenException('This offer was not sent to you');
      }

      if (order.offerExpiresAt && new Date() > order.offerExpiresAt) {
        throw new ConflictException('Offer has already expired');
      }

      if (order.status !== OrderStatus.OFFERED_TO_DRIVER) {
        throw new ConflictException(
          `Order is no longer available (status: ${order.status})`,
        );
      }

      throw new BadRequestException('Could not accept offer');
    }

    this.logger.log(`Driver ${user.idUser} accepted order ${idOrder} via HTTP`);

    return { idOrder, status: OrderStatus.CONFIRMED };
  }

  // ─── Rechazar oferta ────────────────────────────────────────────────────────

  async rejectOffer(idOrder: string, dto: RejectOfferDto, user: RequestUser) {
    const order = await this.prisma.order.findFirst({
      where: { idOrder, idTenant: user.tenantId },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (order.offeredDriverId !== user.idUser) {
      throw new ForbiddenException('This offer was not sent to you');
    }

    if (order.status !== OrderStatus.OFFERED_TO_DRIVER) {
      throw new ConflictException(
        `Order is no longer available (status: ${order.status})`,
      );
    }

    if (dto.reason) {
      this.logger.log(
        `Driver ${user.idUser} rejected order ${idOrder}: "${dto.reason}"`,
      );
    }

    // Incrementar contador de rechazos del driver
    await this.prisma.user.update({
      where: { idUser: user.idUser },
      data: { rejectionCount: { increment: 1 } },
    });

    // Delegar al DispatchService — busca el siguiente driver
    await this.dispatch.rejectOffer(idOrder, user.idUser);

    return { idOrder, message: 'Offer rejected. Searching next driver.' };
  }

  // ─── Actualizar estado del pedido (PICKED_UP / DELIVERED) ──────────────────

  async updateOrderStatus(
    idOrder: string,
    dto: UpdateOrderStatusDto,
    user: RequestUser,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { idOrder, idTenant: user.tenantId },
    });

    if (!order) throw new NotFoundException('Order not found');

    // Solo el driver asignado puede cambiar el estado
    if (order.idDriver !== user.idUser) {
      throw new ForbiddenException(
        'You are not the assigned driver for this order',
      );
    }

    // Validar que la transición es correcta
    const requiredCurrentStatus = DRIVER_TRANSITIONS[dto.status];
    if (order.status !== requiredCurrentStatus) {
      throw new BadRequestException(
        `Cannot move to "${dto.status}" from "${order.status}". Expected current status: "${requiredCurrentStatus}"`,
      );
    }

    await this.prisma.order.update({
      where: { idOrder },
      data: { status: dto.status },
    });

    // Si entregó el pedido, liberar al driver para nuevos pedidos
    if (dto.status === DriverOrderTransition.DELIVERED) {
      await this.prisma.user.update({
        where: { idUser: user.idUser },
        data: { isAvailable: true },
      });
      this.logger.log(`Order ${idOrder} delivered by driver ${user.idUser}`);
    }

    // Notificar al customer via WebSocket
    this.gateway.emitOrderStatusUpdate(idOrder, dto.status, {
      idDriver: user.idUser,
    });

    return { idOrder, status: dto.status };
  }
}
