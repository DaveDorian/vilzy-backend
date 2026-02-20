import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';

@Module({
  imports: [PrismaModule],
  providers: [TrackingGateway, TrackingService],
  exports: [TrackingGateway],
})
export class TrackingModule {}
