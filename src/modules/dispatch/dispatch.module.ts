import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DispatchService } from './dispatch.service';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [PrismaModule, TrackingModule],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
