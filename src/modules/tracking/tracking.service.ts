import { Injectable, Logger } from '@nestjs/common';
import { calculateETA, haversineDistance } from 'src/common/util/geo.util';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TrackingService {
  constructor(private prisma: PrismaService) {}

  async handleLocationUpdate(params: {
    orderId: string;
    driverId: string;
    lat: number;
    lng: number;
  }) {
    const { orderId, driverId, lat, lng } = params;

    await this.prisma.driverLocation.upsert({
      where: { idDriver: driverId },
      update: { lat, lng },
      create: { idDriver: driverId, lat, lng },
    });

    const order = await this.prisma.order.findUnique({
      where: { idOrder: orderId },
      select: {
        idOrder: true,
        customerLat: true,
        customerLng: true,
      },
    });

    const distance = haversineDistance(
      lat,
      lng,
      order!.customerLat!,
      order!.customerLng!,
    );
    const etaMinutes = calculateETA(distance);

    return {
      orderId,
      driverLocation: { lat, lng },
      etaMinutes,
    };
  }
}
