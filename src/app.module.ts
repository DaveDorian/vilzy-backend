import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { ProductsModule } from './modules/products/products.module';
import { RestaurantModule } from './modules/restaurant/restaurant.module';
import { OrdersModule } from './modules/orders/orders.module';
import { TrackingGateway } from './modules/tracking/tracking.gateway';
import { TrackingModule } from './modules/tracking/tracking.module';
import { DispatchService } from './modules/dispatch/dispatch.service';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { TrackingService } from './modules/tracking/tracking.service';
import { MapboxService } from './map/mapbox/mapbox.service';
import { MapModule } from './map/map.module';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { QueueModule } from './modules/queue/queue.module';

ScheduleModule.forRoot();
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ProductsModule,
    RestaurantModule,
    OrdersModule,
    TrackingModule,
    DispatchModule,
    MapModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    TrackingGateway,
    DispatchService,
    TrackingService,
    MapboxService,
  ],
})
export class AppModule {}
