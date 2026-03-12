import { Module } from '@nestjs/common';
import { LogisticsListener } from './logistics.listener';

@Module({
  providers: [LogisticsListener],
})
export class LogisticsModule {}
