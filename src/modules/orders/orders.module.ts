import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { DriverLocationController } from '../driver-location/driver-location.controller';
import { DispatchService } from '../dispatch/dispatch.service';
import { OrdersGateway } from '../gateway/orders.gateway';
import { DriverLocationService } from '../driver-location/driver-location.service';

@Module({
  controllers: [OrdersController, DriverLocationController],
  providers: [
    OrdersService,
    DispatchService,
    OrdersGateway,
    DriverLocationService,
  ],
  exports: [OrdersGateway, DispatchService],
})
export class OrdersModule {}
