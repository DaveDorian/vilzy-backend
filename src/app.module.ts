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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ProductsModule,
    RestaurantModule,
    OrdersModule,
    TrackingModule,
    DispatchModule,
  ],
  controllers: [AppController],
  providers: [AppService, TrackingGateway, DispatchService, TrackingService],
})
export class AppModule {}
