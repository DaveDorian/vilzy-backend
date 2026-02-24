import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DispatchService } from './dispatch.service';
import { TrackingModule } from '../tracking/tracking.module';
import { DispatchWorker } from './dispatch.worker';
import { QueueModule } from '../queue/queue.module';
import { DispatchProcessor } from './dispatch.processor';

@Module({
  imports: [PrismaModule, TrackingModule, QueueModule],
  providers: [DispatchService, DispatchWorker, DispatchProcessor],
  exports: [DispatchService],
})
export class DispatchModule {}
