import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { DispatchService } from './dispatch.service';
import { Job, Worker } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import IORedis from 'ioredis';

@Processor('dispatch')
@Injectable()
export class DispatchProcessor {
  private worker: Worker;

  constructor(
    private dispatchService: DispatchService,
    private prisma: PrismaService,
  ) {
    const connection = new IORedis({
      host: 'localhost',
      port: 6379,
    });

    this.worker = new Worker(
      'dispatch',
      async (job) => {
        const { orderId } = job.data;

        if (job.name === 'dispatch-order')
          await this.dispatchService.matchOrder(orderId);

        if (job.name === 'redispatch-order')
          await this.dispatchService.handleRedispatch(orderId);

        await this.dispatchService.matchOrder(orderId);
      },
      { connection: connection.options },
    );
  }

  /*async process(job: Job) {
    const { orderId, tenantId } = job.data;

    const order = await this.prisma.order.findUnique({
      where: { idOrder: orderId },
    });

    if (!order) return;

    const radius = this.getSearchRadius(job.attemptsMade);

    const drivers = await this.findBestDriver(orderId, radius);

    if (!drivers!.length) throw new Error('No drivers in radius');

    const driver = drivers![0];

    await this.prisma.order.update({
      where: { idOrder: orderId },
      data: {
        offeredDriverId: driver.idUser,
        offerExpiresAt: new Date(Date.now() + 15000),
        status: 'OFFERED_TO_DRIVER',
      },
    });

    return;

    //await this.dispatchService.autoAssignDriver(orderId, tenantId);
  }*/
  /*
  @OnWorkerEvent('failed')
  async onFailed(job: Job) {
    const { orderId } = job.data;

    await this.prisma.order.update({
      where: { idOrder: orderId },
      data: {
        status: 'CANCELLED',
      },
    });
  }

  async findBestDriver(order: any, radius: number) {
    const { pickupLat, pickupLng, idTenant } = order;

    const drivers = await this.prisma.$queryRaw<
      { idUser: string; distance: number }[]
    >`
      SELECT 
        u."idUser",
        ST_Distance(
          dl.location::geography,
          ST_SetSRID(ST_MakePoint(${pickupLng}, ${pickupLat}), 4326)::geography
        ) AS distance
      FROM "User" u
      JOIN "DriverLocation" dl
        ON u."idUser" = dl."idDriver"
      WHERE 
        u.role = 'DRIVER'
        AND u."isOnline" = true
        AND u."isAvailable" = true
        AND (
          u."isShared" = true
          OR u."idTenant" = ${idTenant}
        )
        AND ST_DWithin(
          dl.location::geography,
          ST_SetSRID(ST_MakePoint(${pickupLng},${pickupLat},4326)::geography,)
        )
      ORDER BY dl.location <-> 
        ST_SetSRID(ST_MakePoint(${pickupLng}, ${pickupLat}), 4326)
      LIMIT 5;
    `;

    if (!drivers.length) return null;

    return drivers;
  }

  private getSearchRadius(attempt: number): number {
    const radiusSteps = [3000, 5000, 8000, 12000];
    return radiusSteps[Math.min(attempt, radiusSteps.length - 1)];
  }*/
}
