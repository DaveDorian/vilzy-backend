import { Module } from '@nestjs/common';
import { MapboxService } from './mapbox/mapbox.service';

@Module({
  providers: [MapboxService],
  exports: [MapboxService],
})
export class MapModule {}
