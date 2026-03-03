import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto, tenantId: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { idRestaurant: dto.idRestaurant, idTenant: tenantId },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.prisma.product.create({
      data: {
        name: dto.name,
        price: dto.price,
        idRestaurant: dto.idRestaurant,
      },
    });
  }

  async findAllByRestaurant(tenantId: string, restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { idRestaurant: restaurantId, idTenant: tenantId },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.prisma.product.findMany({
      where: { idRestaurant: restaurantId },
    });
  }

  async findOne(idProduct: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { idProduct, restaurant: { idTenant: tenantId } },
      include: { restaurant: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(idProduct: string, dto: UpdateProductDto, tenantId: string) {
    await this.findOne(idProduct, tenantId);

    return this.prisma.product.update({
      where: { idProduct },
      data: dto,
    });
  }

  async delete(idProduct: string, tenantId: string) {
    await this.findOne(idProduct, tenantId);

    return this.prisma.product.delete({
      where: { idProduct },
    });
  }
}
