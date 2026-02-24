import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DispatchService } from './dispatch.service';

@Injectable()
export class DispatchWorker {
  constructor(private dispatchService: DispatchService) {}

  @Cron('*/5*****')
  async handleDispatch() {
    await this.dispatchService.processPendingOrders();
  }

  /*async checkExpiredOffers() {
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

      await this.dispatchQueue.add('dispatch-order', {
        orderId: order.idOrder,
        tenantId: order.idTenant,
      });
    }
  }*/
}
