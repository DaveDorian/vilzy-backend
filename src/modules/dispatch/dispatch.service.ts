import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TrackingGateway } from '../tracking/tracking.gateway';

@Injectable()
export class DispatchService {
  constructor(
    private prisma: PrismaService,
    private trackingGateway: TrackingGateway,
  ) {}

  async autoAssignDriver(orderId: string, tenantId: string) {
    const order = await this.prisma.order.findFirst({
      where: { idOrder: orderId, idTenant: tenantId },
      select: {
        idOrder: true,
        restaurant: {
          select: {
            lat: true,
            lng: true,
          },
        },
        idDriver: true,
      },
    });

    if (!order) return null;
    if (order.idDriver) return order;

    const radiusMeters = 3000;

    const nearbyDrivers = await this.prisma.$queryRaw<
      { driverId: string; distance: number }[]
    >`
    SELECT
    dl."idDriver",
    ST_Distance(
        dl.location,
        ST_SetSRID(ST_MakePoint(${order.restaurant.lng}, ${order.restaurant.lat}), 4326)
    ) AS distance
    FROM "DriverLocation" dl
    JOIN "User" u ON u.idUser = dl."idDriver"
    WHERE
    u."idTenant" = ${tenantId}
    AND u."isOnline" = true
    AND u."isAvailable" = true
    AND ST_DWithin(
        dl.location,
        ST_SetSRID(ST_MakePoint(${order.restaurant.lng}, ${order.restaurant.lat}), 4326),
        ${radiusMeters}
    )
    ORDER BY distance ASC
    LIMIT 5;
    `;

    if (!nearbyDrivers.length) return null;

    const bestDriver = nearbyDrivers[0];

    await this.offerOrderToDriver({
      orderId,
      driverId: bestDriver.driverId,
      offerSeconds: 15,
    });

    /*const updateOrder = await this.prisma.$transaction(async (tx) => {
      const freshOrder = await tx.order.findUnique({
        where: { idOrder: orderId },
      });

      if (!freshOrder || freshOrder.idDriver) return freshOrder;

      return tx.order.update({
        where: { idOrder: orderId },
        data: {
          idDriver: bestDriver.driverId,
          status: 'ASSIGNED',
        },
      });
    });*/

    this.trackingGateway.server
      .to(`driver-${bestDriver.driverId}`)
      .emit('order:offer', {
        orderId,
        expiresIn: 15,
      });
  }

  async offerOrderToDriver(params: {
    orderId: string;
    driverId: string;
    offerSeconds: number;
  }) {
    const expiresAt = new Date(Date.now() + params.offerSeconds * 1000);

    const order = await this.prisma.order.update({
      where: { idOrder: params.orderId },
      data: {
        status: 'OFFERED_TO_DRIVER',
        offeredDriverId: params.driverId,
        offerExpiresAt: expiresAt,
      },
    });

    return order;
  }

  async acceptedOrder(params: { orderId: string; driverId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { idOrder: params.orderId },
      });

      if (!order) throw new Error('Order not found');

      if (order.offeredDriverId !== params.driverId)
        throw new Error('Driver not authorized');

      if (!order.offerExpiresAt || order.offerExpiresAt < new Date())
        throw new Error('Offer expired');

      return tx.order.update({
        where: { idOrder: params.orderId },
        data: {
          status: 'ASSIGNED',
          idDriver: params.driverId,
          offeredDriverId: null,
          offerExpiresAt: null,
        },
      });
    });
  }

  async rejectOrder(params: { orderId: string; driverId: string }) {}
}
