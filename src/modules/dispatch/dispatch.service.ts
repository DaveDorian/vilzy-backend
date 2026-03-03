import { Injectable, Logger } from '@nestjs/common';
import { OrdersGateway } from '../gateway/orders.gateway';
import { OrderStatus } from '../orders/dto/order.dto';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';

const OFFER_TIMEOUT_SECONDS = 30; // Tiempo que tiene el driver para aceptar
const MAX_DISPATCH_ATTEMPTS = 5; // Máximo de drivers a los que ofrecer
const SEARCH_RADIUS_METERS = 5000; // Radio inicial de búsqueda (5 km)

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  // Timers activos por pedido para poder cancelarlos si el driver acepta
  private readonly offerTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: OrdersGateway,
  ) {}

  // ─── Punto de entrada: lanza el ciclo de dispatch ─────────────────────────

  async startDispatch(idOrder: string, idTenant: string): Promise<void> {
    this.logger.log(`Starting dispatch for order ${idOrder}`);

    const order = await this.prisma.order.update({
      where: { idOrder },
      data: { status: OrderStatus.SEARCHING_DRIVER },
      include: { restaurant: true },
    });

    this.gateway.emitOrderStatusUpdate(idOrder, OrderStatus.SEARCHING_DRIVER);

    await this.offerToNextDriver(
      idOrder,
      idTenant,
      order.restaurant.lat,
      order.restaurant.lng,
    );
  }

  // ─── Busca el siguiente driver disponible y le hace la oferta ─────────────

  async offerToNextDriver(
    idOrder: string,
    idTenant: string,
    pickupLat: number,
    pickupLng: number,
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { idOrder },
      include: { restaurant: true },
    });

    if (!order || order.status === OrderStatus.CANCELLED) {
      this.logger.log(
        `Dispatch aborted for order ${idOrder}: cancelled or not found`,
      );
      return;
    }

    if (order.dispatchAttempts >= MAX_DISPATCH_ATTEMPTS) {
      this.logger.warn(
        `Order ${idOrder} exceeded max dispatch attempts. Marking as FAILED`,
      );
      await this.prisma.order.update({
        where: { idOrder },
        data: { status: OrderStatus.FAILED },
      });
      this.gateway.emitOrderStatusUpdate(idOrder, OrderStatus.FAILED);
      return;
    }

    // Buscar el driver más cercano disponible con PostGIS
    // Excluir drivers que ya rechazaron este pedido (offeredDriverId guarda el último)
    const driver = await this.findNearestDriver(
      idTenant,
      pickupLat,
      pickupLng,
      order.offeredDriverId ?? undefined,
    );

    if (!driver) {
      this.logger.warn(`No available drivers found for order ${idOrder}`);
      // Reintentar en 15 segundos por si algún driver se conecta
      setTimeout(() => {
        this.offerToNextDriver(idOrder, idTenant, pickupLat, pickupLng);
      }, 15_000);
      return;
    }

    const expiresAt = new Date(Date.now() + OFFER_TIMEOUT_SECONDS * 1000);

    // Actualizar orden con el driver al que se le ofrece
    await this.prisma.order.update({
      where: { idOrder },
      data: {
        status: OrderStatus.OFFERED_TO_DRIVER,
        offeredDriverId: driver.idUser,
        offerExpiresAt: expiresAt,
        dispatchAttempts: { increment: 1 },
        lastDispatchAt: new Date(),
      },
    });

    this.gateway.emitOrderStatusUpdate(idOrder, OrderStatus.OFFERED_TO_DRIVER, {
      driverName: `${driver.name} ${driver.surname}`,
    });

    // Enviar oferta al driver por WebSocket
    const delivered = this.gateway.emitDriverOffer(driver.idUser, {
      idOrder,
      restaurantName: order.restaurant.name,
      deliveryAddress: order.deliveryAddress,
      pickupLat: order.pickupLat,
      pickupLng: order.pickupLng,
      deliveryLat: order.deliveryLat,
      deliveryLng: order.deliveryLng,
      total: order.total,
      expiresAt,
    });

    if (!delivered) {
      // Driver no está conectado por WS — aquí se podría enviar FCM
      this.logger.warn(
        `Driver ${driver.idUser} offline on WS. Should send FCM.`,
      );
      // TODO: fcmService.sendOrderOffer(driver.fcmToken, offerData)
    }

    this.logger.log(
      `Offer sent to driver ${driver.idUser} for order ${idOrder} | expires at ${expiresAt.toISOString()}`,
    );

    // Iniciar timer de timeout
    const timer = setTimeout(async () => {
      await this.handleOfferTimeout(
        idOrder,
        idTenant,
        pickupLat,
        pickupLng,
        driver.idUser,
      );
    }, OFFER_TIMEOUT_SECONDS * 1000);

    this.offerTimers.set(idOrder, timer);
  }

  // ─── Driver acepta la oferta ───────────────────────────────────────────────

  async acceptOffer(idOrder: string, idDriver: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({ where: { idOrder } });

    if (!order || order.status !== OrderStatus.OFFERED_TO_DRIVER) return false;
    if (order.offeredDriverId !== idDriver) return false;
    if (order.offerExpiresAt && new Date() > order.offerExpiresAt) return false;

    // Cancelar el timer de timeout
    this.clearOfferTimer(idOrder);

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { idOrder },
        data: {
          status: OrderStatus.CONFIRMED,
          idDriver,
          offerExpiresAt: null,
          offeredDriverId: null,
        },
      }),
      // Marcar driver como no disponible para nuevas ofertas
      this.prisma.user.update({
        where: { idUser: idDriver },
        data: { isAvailable: false },
      }),
    ]);

    this.gateway.emitOrderStatusUpdate(idOrder, OrderStatus.CONFIRMED, {
      idDriver,
    });
    this.logger.log(`Order ${idOrder} accepted by driver ${idDriver}`);
    return true;
  }

  // ─── Driver rechaza la oferta ──────────────────────────────────────────────

  async rejectOffer(idOrder: string, idDriver: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { idOrder },
      include: { restaurant: true },
    });

    if (!order || order.offeredDriverId !== idDriver) return;

    this.clearOfferTimer(idOrder);
    this.gateway.emitOfferExpired(idDriver, idOrder);

    this.logger.log(
      `Driver ${idDriver} rejected order ${idOrder}. Searching next driver.`,
    );

    // Buscar el siguiente driver
    await this.offerToNextDriver(
      idOrder,
      order.idTenant,
      order.restaurant.lat,
      order.restaurant.lng,
    );
  }

  // ─── Timeout: driver no respondió ─────────────────────────────────────────

  private async handleOfferTimeout(
    idOrder: string,
    idTenant: string,
    pickupLat: number,
    pickupLng: number,
    idDriver: string,
  ) {
    // Verificar que la orden sigue esperando (no fue aceptada en el último momento)
    const order = await this.prisma.order.findUnique({ where: { idOrder } });
    if (!order || order.status !== OrderStatus.OFFERED_TO_DRIVER) return;

    this.logger.warn(
      `Offer timeout for driver ${idDriver} on order ${idOrder}`,
    );
    this.gateway.emitOfferExpired(idDriver, idOrder);
    this.offerTimers.delete(idOrder);

    // Volver a buscar driver
    await this.offerToNextDriver(idOrder, idTenant, pickupLat, pickupLng);
  }

  // ─── Cancelar timer activo ─────────────────────────────────────────────────

  private clearOfferTimer(idOrder: string) {
    const timer = this.offerTimers.get(idOrder);
    if (timer) {
      clearTimeout(timer);
      this.offerTimers.delete(idOrder);
    }
  }

  // ─── Consulta PostGIS: driver más cercano disponible ──────────────────────

  private async findNearestDriver(
    idTenant: string,
    lat: number,
    lng: number,
    excludeDriverId?: string,
  ) {
    // Usamos $queryRaw para aprovechar el índice espacial de PostGIS
    // ST_DWithin filtra por radio antes de ordenar por distancia (mucho más eficiente)
    const results = await this.prisma.$queryRaw<
      Array<{
        idUser: string;
        name: string;
        surname: string;
        fcmToken: string | null;
        distance: number;
      }>
    >`
      SELECT
        u."idUser",
        u."name",
        u."surname",
        u."fcmToken",
        ST_Distance(
          dl.location::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) AS distance
      FROM "DriverLocation" dl
      JOIN "User" u ON u."idUser" = dl."idDriver"
      WHERE
        u."idTenant"    = ${idTenant}
        AND u."isOnline"    = true
        AND u."isAvailable" = true
        AND u."isActive"    = true
        AND ST_DWithin(
          dl.location::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${SEARCH_RADIUS_METERS}
        )
        ${excludeDriverId ? this.prisma.$queryRaw`AND u."idUser" != ${excludeDriverId}` : this.prisma.$queryRaw``}
      ORDER BY distance ASC
      LIMIT 1
    `;

    return results[0] ?? null;
  }
}
