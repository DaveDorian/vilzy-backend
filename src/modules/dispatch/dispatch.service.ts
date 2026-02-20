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
    });

    if (!order || !order.deliveryLat || !order.deliveryLng) return null;

    const drivers = await this.prisma.driverLocation.findMany({
      where: { isOnline: true },
      include: { driver: true },
    });

    if (!drivers.length) return null;

    let bestDriver = null;
    let bestDistance = Infinity;

    for (const driver of drivers) {
      const distance = haversineDistance(
        driver.lat,
        driver.lng,
        order.deliveryLat,
        order.deliveryLng,
      );

      if (distance < bestDistance) {
        bestDistance = distance;
        bestDriver = driver;
      }
    }

    if (!bestDriver) return null;

    const updatedOrder = await this.prisma.order.update({
      where: { idOrder: orderId },
      data: {
        idDriver: bestDriver.idDriver,
        status: 'ASSIGNED',
      },
    });

    this.trackingGateway.server
      .to(`driver-${bestDriver.idDriver}`)
      .emit('driver:new-order', {
        orderId: updatedOrder.idOrder,
        restaurantId: updatedOrder.idRestaurant,
        deliveryAddress: updatedOrder.deliveryAddress,
        total: updatedOrder.total,
      });

    return updatedOrder;
  }
}
