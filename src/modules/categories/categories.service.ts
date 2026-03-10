import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto, tenantId: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { idTenant: tenantId, idRestaurant: dto.idRestaurant },
    });

    if (!restaurant) throw new NotFoundException('Restaurant not found');

    return this.prisma.category.create({
      data: {
        name: dto.name,
        displayOrder: dto.displayOrder,
        idRestaurant: dto.idRestaurant,
      },
    });
  }

  async findByIdRestaurant(tenantId: string, restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { idTenant: tenantId, idRestaurant: restaurantId },
    });

    if (!restaurant) throw new NotFoundException('Restaurant not found');

    return await this.prisma.category.findMany({
      where: { idRestaurant: restaurantId, isActive: true },
      select: {
        idCategory: true,
        name: true,
        displayOrder: true,
      },
    });
  }
}
