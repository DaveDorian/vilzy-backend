import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DispatchService } from './dispatch.service';

@Module({
  imports: [PrismaModule],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
