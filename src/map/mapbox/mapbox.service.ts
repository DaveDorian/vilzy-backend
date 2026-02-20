import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MapboxService {
  private readonly baseUrl =
    'https://api.mapbox.com/directions/v5/mapbox/driving';

  async getRoute(params: {
    fromLat: number;
    fromLng: number;
    toLat: number;
    toLng: number;
  }) {
    try {
      const { fromLat, fromLng, toLat, toLng } = params;

      const url = `${this.baseUrl}/${fromLng},${fromLat}; ${toLng},${toLat}`;

      const response = await axios.get(url, {
        params: {
          access_token: process.env.MAPBOX_TOKEN,
          geometries: 'polyline6',
          overview: 'full',
        },
      });

      const route = response.data.routes?.[0];

      if (!route) throw new InternalServerErrorException('Route Not Found');

      return {
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        polyline: route.geometry,
      };
    } catch (error) {
      throw new InternalServerErrorException('Mapbox routing failed');
    }
  }
}
