import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRestaurantDto, tenantId: string) {
    return this.prisma.restaurant.create({
      data: {
        ...dto,
        idTenant: tenantId,
      },
    });
  }

  findAll(tenantId: string) {
    return this.prisma.restaurant.findMany({
      where: { idTenant: tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(idRestaurant: string, tenantId: string) {
    const restaurant = this.prisma.restaurant.findFirst({
      where: { idRestaurant, idTenant: tenantId },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }

  async update(
    idRestaurant: string,
    dto: CreateRestaurantDto,
    tenantId: string,
  ) {
    await this.findOne(idRestaurant, tenantId);

    return this.prisma.restaurant.update({
      where: { idRestaurant },
      data: dto,
    });
  }

  async toggleActive(
    idRestaurant: string,
    tenantId: string,
    isActive: boolean,
  ) {
    await this.findOne(idRestaurant, tenantId);

    return this.prisma.restaurant.update({
      where: { idRestaurant },
      data: { isActive },
    });
  }
}
