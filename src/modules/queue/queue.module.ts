import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { BullModule } from '@nestjs/bullmq';
import { DispatchService } from '../dispatch/dispatch.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'dispatch',
    }),
  ],
  providers: [QueueService, DispatchService],
  exports: [BullModule],
})
export class QueueModule {}
