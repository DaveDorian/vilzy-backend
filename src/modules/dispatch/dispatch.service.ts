import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { Queue } from 'bullmq';
import { sortByDistance } from 'src/common/util/geo.util';

@Injectable()
export class DispatchService {
  constructor(
    private prisma: PrismaService,
    private trackingGateway: TrackingGateway,
    private dispatchQueue: Queue,
  ) {}

  async handleRedispatch(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { idOrder: orderId },
    });

    if (!order) return;

    if (order.status !== 'ASSIGNED') return;

    if (order.dispatchAttempts < 6) {
      await this.prisma.order.update({
        where: { idOrder: orderId },
        data: {
          status: 'FAILED',
          idDriver: null,
        },
      });
      return;
    }

    await this.prisma.order.update({
      where: { idOrder: orderId },
      data: {
        status: 'PENDING',
        idDriver: null,
        dispatchAttempts: { increment: 1 },
      },
    });

    await this.dispatchQueue.add('dispatch-order', { orderId: orderId });
  }

  async processPendingOrders() {
    const orders = await this.prisma.order.findMany({
      where: { status: 'PENDING' },
    });

    for (const order of orders) {
      await this.matchOrder(order.idOrder);
    }
  }

  async matchOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { idOrder: orderId },
    });

    if (!order || order.status !== 'PENDING') return;

    const drivers = await this.getAvailableDrivers(order.idTenant);

    if (!drivers.length) return;

    const sortedDrivers = sortByDistance(
      drivers,
      order.pickupLat,
      order.pickupLng,
    );

    for (const driver of sortedDrivers) {
      const assigned = await this.tryAssign(order.idOrder, driver.idDriver);
      if (assigned) {
        await this.dispatchQueue.add(
          'redispatch-order',
          { orderId: order.idOrder },
          {
            delay: 15000,
            jobId: `redispatch-${order.idOrder}`,
            removeOnComplete: true,
          },
        );
        return;
      }
    }
  }

  async getAvailableDrivers(tenantId: string) {
    //TODO: leer de redis los ids de los drivers
    /*const driverIds = await this.redis.getOnlineDrivers(tenantId);

    if(!driverIds.length) return [];*/

    return this.prisma.user.findMany({
      where: {
        idTenant: tenantId,
        isAvailable: true,
      },
    });
  }

  async tryAssign(orderId: string, driverId: string) {
    const result = await this.prisma.order.updateMany({
      where: {
        idOrder: orderId,
        status: 'PENDING',
      },
      data: {
        status: 'ASSIGNED',
        idDriver: driverId,
      },
    });

    return result.count > 0;
  }

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
    const order = await this.prisma.order.findUnique({
      where: { idOrder: params.orderId },
    });

    if (!order) return;

    if (order.idDriver !== params.driverId) return;

    await this.prisma.order.update({
      where: { idOrder: params.orderId },
      data: {
        status: 'CONFIRMED',
      },
    });

    await this.dispatchQueue.remove(`redispatch-${params.orderId}`);

    /*return this.prisma.$transaction(async (tx) => {
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
    });*/
  }

  async rejectOrder(params: { orderId: string; driverId: string }) {
    const order = await this.prisma.order.findUnique({
      where: { idOrder: params.orderId },
    });

    if (!order) return;

    if (order.idDriver !== params.driverId) return;

    await this.prisma.order.update({
      where: { idOrder: params.orderId },
      data: {
        status: 'PENDING',
        idDriver: null,
      },
    });

    await this.dispatchQueue.remove(`redispatch-${params.orderId}`);

    await this.dispatchQueue.add('dispatch-order', { orderId: params.orderId });
    /*await this.prisma.order.update({
      where: { idOrder: params.orderId },
      data: {
        status: 'SEARCHING_DRIVER',
        offeredDriverId: null,
        offerExpiresAt: null,
      },
    });

    await this.dispatchQueue.add('dispatch-order', {
      orderId: params.orderId,
      driverId: params.driverId,
    });*/
  }
}
