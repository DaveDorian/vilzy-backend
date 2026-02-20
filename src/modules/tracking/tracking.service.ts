import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  async handleLocationUpdate(data: {
    userId: string;
    lat: number;
    lng: number;
    tenantId: string;
  }) {
    this.logger.log(
      `Location updated: ${data.userId} -> (${data.lng},${data.lng})`,
    );

    return data;
  }
}
