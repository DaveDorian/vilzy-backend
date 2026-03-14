import { Module } from '@nestjs/common';
import { LogisticsListener } from './logistics.listener';
import { DriversModule } from '../drivers/drivers.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { TrackingGateway } from './gateways/tracking.gateway';

@Module({
  imports: [DriversModule, NotificationsModule],
  providers: [LogisticsListener, TrackingGateway],
})
export class LogisticsModule {}
