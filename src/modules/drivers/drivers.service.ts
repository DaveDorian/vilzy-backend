import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateDriverDto } from './dto/create-driver.dto';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  async createDriver(dto: CreateDriverDto, idTenant: string) {
    console.log(`dto: ${dto},tenantId: ${idTenant}`);
    const hashPassword = await bcrypt.hash(dto.ci, 10);

    return await this.prisma.$transaction(async (tx) => {
      // 1. Crear el Usuario
      const user = await tx.user.create({
        data: {
          name: dto.name,
          surname: dto.surname,
          email: dto.email,
          password: hashPassword,
          ci: dto.ci,
          role: 'DRIVER',
          idTenant,
        },
      });

      // 2. Crear el Perfil de Driver
      await tx.driverProfile.create({
        data: {
          idDriver: user.idUser,
          vehiclePlate: dto.plateCar,
          vehicleType: dto.typeCar,
        },
      });

      // 3. Inicializar ubicación en PostGIS (Raw SQL para geometry)
      const lat = dto.lat || -17.338117216653316; // Cochabamba default
      const lng = dto.lng || -66.2195730782737;

      await tx.$executeRawUnsafe(`
        UPDATE "DriverProfile" 
        SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
        WHERE "idDriver" = '${user.idUser}'
      `);

      return user;
    });
  }

  /**
   * Búsqueda Espacial: Encuentra conductores disponibles en un radio de KM
   */
  async findNearbyDrivers(
    restaurantLat: number,
    restaurantLng: number,
    radiusInKm: number,
    idTenant: string,
  ) {
    // ST_DistanceSphere devuelve metros. Comparamos con radius * 1000.
    return await this.prisma.$queryRawUnsafe(`
      SELECT d."idDriver", u.name, u."fcmToken",
             ST_DistanceSphere(d.location, ST_SetSRID(ST_MakePoint(${restaurantLng}, ${restaurantLat}), 4326)) as distance
      FROM "DriverProfile" d
      JOIN "User" u ON d."idDriver" = u."idUser"
      WHERE d."isOnline" = true 
        AND d."isAvailable" = true 
        AND u."idTenant" = '${idTenant}'
        AND ST_DWithin(d.location::geography, ST_SetSRID(ST_MakePoint(${restaurantLng}, ${restaurantLat}), 4326)::geography, ${radiusInKm * 1000})
      ORDER BY distance ASC
      LIMIT 10
    `);
  }
}
