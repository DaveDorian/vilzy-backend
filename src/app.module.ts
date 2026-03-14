import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { UsersModule } from './modules/users/users.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { DriversService } from './modules/drivers/drivers.service';
import { PushNotificationsService } from './modules/notifications/push-notifications.service';
import { DriversModule } from './modules/drivers/drivers.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
ScheduleModule.forRoot();
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    AuthModule,
    PrismaModule,
    TenantModule,
    UsersModule,
    RestaurantsModule,
    ProductsModule,
    OrdersModule,
    CategoriesModule,
    LogisticsModule,
    DriversModule,
    NotificationsModule,
  ],
  controllers: [],
  providers: [DriversService, PushNotificationsService],
})
export class AppModule {}
