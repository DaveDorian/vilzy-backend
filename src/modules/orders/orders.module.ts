import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { DriverLocationController } from '../driver-location/driver-location.controller';
import { DispatchService } from '../dispatch/dispatch.service';
import { OrdersGateway } from '../gateway/orders.gateway';
import { DriverLocationService } from '../driver-location/driver-location.service';
import { DriverResponseController } from '../driver-response/driver-response.controller';
import { DriverResponseService } from '../driver-response/driver-response.service';

@Module({
  controllers: [
    OrdersController,
    DriverLocationController,
    DriverResponseController,
  ],
  providers: [
    OrdersService,
    DispatchService,
    OrdersGateway,
    DriverLocationService,
    DriverResponseService,
  ],
  exports: [OrdersGateway, DispatchService],
})
export class OrdersModule {}
