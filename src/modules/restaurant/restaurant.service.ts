import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RestaurantService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateRestaurantDto) {
    return await this.prisma.restaurant.create({
      data: {
        name: dto.name,
        address: dto.address,
        lat: dto.lat!,
        lng: dto.lng!,
        idTenant: tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    return await this.prisma.restaurant.findMany({
      where: { idTenant: tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, idRestaurant: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        idRestaurant: idRestaurant,
        idTenant: tenantId,
      },
    });

    if (!restaurant) throw new NotFoundException('Restaurant not found');

    return restaurant;
  }

  async update(
    tenantId: string,
    idRestaurant: string,
    dto: UpdateRestaurantDto,
  ) {
    await this.findOne(tenantId, idRestaurant);
    return await this.prisma.restaurant.update({
      where: { idRestaurant },
      data: dto,
    });
  }

  async remove(tenantId: string, idRestaurant: string) {
    await this.findOne(tenantId, idRestaurant);
    return await this.prisma.restaurant.update({
      where: { idRestaurant },
      data: { isActive: false },
    });
  }
}
