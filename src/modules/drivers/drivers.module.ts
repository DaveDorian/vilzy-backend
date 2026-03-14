import { Module } from '@nestjs/common';
import { DriversLogicService } from './drivers-logic.service';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';

@Module({
  providers: [DriversLogicService, DriversService, PrismaService],
  exports: [DriversLogicService],
  controllers: [DriversController],
})
export class DriversModule {}
