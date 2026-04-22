import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';

@Injectable()
export class DriversLogicService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca conductores cercanos usando ST_DWithin para eficiencia.
   * Se filtra por Tenant, Disponibilidad y Radio.
   */
  async findNearbyDrivers(
    lat: number,
    lng: number,
    radiusInKm: number,
    idTenant: string,
  ): Promise<any[]> {
    // Nota: Usamos queryRaw porque Prisma no soporta funciones nativas de PostGIS
    return await this.prisma.$queryRawUnsafe(`
      SELECT 
        d."idDriver", 
        u."fcmToken", 
        u.name,
        ST_DistanceSphere(
          dl.location, 
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
        ) as distance_meters
      FROM "DriverProfile" d
      JOIN "User" u ON d."idDriver" = u."idUser"
      JOIN "DriverLocation" dl ON d."idDriver" = dl."idDriver"
      WHERE u."idTenant" = '${idTenant}'
        AND d."isOnline" = true 
        AND d."isAvailable" = true
        AND ST_DWithin(
          dl.location::geography, 
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, 
          ${radiusInKm * 1000}
        )
      ORDER BY distance_meters ASC
      LIMIT 10
    `);
  }
}
