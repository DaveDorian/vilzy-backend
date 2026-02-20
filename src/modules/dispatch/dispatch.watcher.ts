import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DispatchWatcher {
  constructor(private prisma: PrismaService) {}

  @Interval(5000)
  async checkExpiredOffers() {
    const expired = await this.prisma.order.findMany({
      where: {
        status: 'OFFERED_TO_DRIVER',
        offerExpiresAt: { lt: new Date() },
      },
    });

    for (const order of expired) {
      await this.prisma.order.update({
        where: { idOrder: order.idOrder },
        data: {
          status: 'SEARCHING_DRIVER',
          offeredDriverId: null,
          offerExpiresAt: null,
        },
      });
    }
  }
}
