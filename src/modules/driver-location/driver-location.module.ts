import { Module } from '@nestjs/common';
import { DriverLocationService } from './driver-location.service';
import { DriverLocationController } from './driver-location.controller';

@Module({
  controllers: [DriverLocationController],
  providers: [DriverLocationService],
})
export class DriverLocationModule {}
