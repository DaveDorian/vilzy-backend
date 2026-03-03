import { Injectable, Logger } from '@nestjs/common';
import { UpdateDriverLocationDto } from './dto/driver-location.dto';
import { v4 as uuid } from 'uuid';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { RequestUser } from 'src/common/interfaces/request-user.interface';

@Injectable()
export class DriverLocationService {
  private readonly logger = new Logger(DriverLocationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Actualiza la ubicación del driver en BD (upsert en DriverLocation)
  // También actualiza el campo geometry para PostGIS
  async updateLocation(dto: UpdateDriverLocationDto, user: RequestUser) {
    const { lat, lng } = dto;

    // Upsert: crea el registro si no existe, actualiza si ya existe
    await this.prisma.$executeRaw`
      INSERT INTO "DriverLocation" ("idDriverLocation", "idDriver", "lat", "lng", "location", "isOnline", "updatedAt")
      VALUES (
        ${uuid()},
        ${user.idUser},
        ${lat},
        ${lng},
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
        true,
        NOW()
      )
      ON CONFLICT ("idDriver") DO UPDATE SET
        "lat"       = EXCLUDED."lat",
        "lng"       = EXCLUDED."lng",
        "location"  = EXCLUDED."location",
        "isOnline"  = true,
        "updatedAt" = NOW()
    `;

    return { lat, lng, updatedAt: new Date() };
  }

  async setOnline(idDriver: string) {
    await this.prisma.user.update({
      where: { idUser: idDriver },
      data: { isOnline: true, isAvailable: true },
    });
  }

  async setOffline(idDriver: string) {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { idUser: idDriver },
        data: { isOnline: false, isAvailable: false },
      }),
      this.prisma.driverLocation.updateMany({
        where: { idDriver },
        data: { isOnline: false },
      }),
    ]);
    this.logger.log(`Driver ${idDriver} went offline`);
  }
}
