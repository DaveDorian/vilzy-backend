import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [TrackingGateway, TrackingService],
  exports: [TrackingGateway],
})
export class TrackingModule {}
