import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MapboxService } from 'src/map/mapbox/mapbox.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TrackingService {
  constructor(
    private prisma: PrismaService,
    private mapboxService: MapboxService,
  ) {}

  async handleLocationUpdate(params: {
    orderId: string;
    driverId: string;
    tenantId: string;
    lat: number;
    lng: number;
  }) {
    const { orderId, driverId, tenantId, lat, lng } = params;

    const order = await this.prisma.order.findUnique({
      where: { idOrder: orderId },
      select: {
        idOrder: true,
        idTenant: true,
        idDriver: true,
        status: true,
        customerLat: true,
        customerLng: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (order.idTenant !== tenantId)
      throw new ForbiddenException('Cross-tenant access denied');

    if (order.idDriver !== driverId)
      throw new ForbiddenException('Driver not assigned to this order');

    await this.prisma.driverLocation.upsert({
      where: { idDriver: driverId },
      update: { lat, lng },
      create: { idDriver: driverId, lat, lng },
    });

    const route = await this.mapboxService.getRoute({
      fromLat: lat,
      fromLng: lng,
      toLat: order.customerLat!,
      toLng: order.customerLng!,
    });

    const etaMinutes = Math.max(1, Math.round(route.durationSeconds / 60));

    return {
      orderId,
      driverLocation: { lat, lng },
      etaMinutes,
      polyline: route.polyline,
    };
  }
}
