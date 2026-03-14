import { Module } from '@nestjs/common';
import { LogisticsListener } from './logistics.listener';
import { DriversModule } from '../drivers/drivers.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DriversModule, NotificationsModule],
  providers: [LogisticsListener],
})
export class LogisticsModule {}
