import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RequestUser } from 'src/common/interfaces/request-user.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN, Role.RESTAURANT_ADMIN)
  @Post()
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: RequestUser) {
    return this.categoriesService.create(dto, user.tenantId);
  }

  @Get('restaurant')
  findAllByIdRestaurant(@CurrentUser() user: RequestUser) {
    return this.categoriesService.findByIdRestaurant(
      user.tenantId,
      user.restaurantId!,
    );
  }
}
