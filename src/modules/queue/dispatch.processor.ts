import { Processor, WorkerHost } from '@nestjs/bullmq';
import { DispatchService } from '../dispatch/dispatch.service';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Processor('dispatch')
@Injectable()
export class DispatchProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private dispatchService: DispatchService,
  ) {
    super();
  }

  async process(job: Job) {
    const { orderId, tenantId } = job.data;

    await this.dispatchService.autoAssignDriver(orderId, tenantId);
  }
}
