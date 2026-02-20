import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TrackingGateway } from './tracking.gateway';

@Module({
  imports: [PrismaModule],
  providers: [TrackingGateway],
  exports: [TrackingGateway],
})
export class TrackingModule {}
