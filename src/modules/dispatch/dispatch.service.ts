import { Injectable } from '@nestjs/common';
import { haversineDistance } from 'src/common/util/geo.util';
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

    const drivers = await this.prisma.driverLocation.findMany({
      where: {
        driver: {
          idTenant: tenantId,
          isOnline: true,
          isAvailable: true,
        },
      },
      include: { driver: true },
    });

    if (!drivers.length) return null;

    const ranked = drivers.map((driver) => ({
      driverId: driver.idDriver,
      distance: haversineDistance(
        order.restaurant.lat,
        order.restaurant.lng,
        driver.lat,
        driver.lng,
      ),
    }));

    ranked.sort((a, b) => a.distance - b.distance);

    const bestDriver = ranked[0];

    const updateOrder = await this.prisma.$transaction(async (tx) => {
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
    });

    this.trackingGateway.server
      .to(`driver-${bestDriver.driverId}`)
      .emit('order:assigned', updateOrder);

    return updateOrder;
  }
}
