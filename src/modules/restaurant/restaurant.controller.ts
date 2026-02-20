import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Tenant } from 'src/common/decorators/tenant.decorator';

@UseGuards(JwtAuthGuard)
@Controller('restaurant')
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateRestaurantDto) {
    return this.restaurantService.create(tenantId, dto);
  }

  @Get()
  findAll(@Tenant() tenantId: string) {
    return this.restaurantService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.restaurantService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantDto,
  ) {
    return this.restaurantService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.restaurantService.remove(tenantId, id);
  }
}
