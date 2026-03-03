import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { Role } from 'generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RequestUser } from 'src/common/interfaces/request-user.interface';

@UseGuards(JwtStrategy, RolesGuard)
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly service: RestaurantsService) {}

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.RESTAURANT_ADMIN)
  @Post()
  create(@Body() dto: CreateRestaurantDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user.tenantId);
  }

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.service.findAll(user.tenantId);
  }

  @Get(':idRestaurant')
  findOne(
    @Param('idRestaurant') idRestaurant: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(idRestaurant, user.tenantId);
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.RESTAURANT_ADMIN)
  @Patch(':idRestaurant')
  update(
    @Param('idRestaurant') idRestaurant: string,
    @Body() dto: CreateRestaurantDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(idRestaurant, dto, user.tenantId);
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.RESTAURANT_ADMIN)
  @Patch(':idRestaurant/status/:state')
  toggle(
    @Param('idRestaurant') idRestaurant: string,
    @Param('state') state: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.toggleActive(
      idRestaurant,
      user.tenantId,
      state === 'true',
    );
  }
}
