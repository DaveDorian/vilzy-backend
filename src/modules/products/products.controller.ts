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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { Role } from 'generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RequestUser } from 'src/common/interfaces/request-user.interface';

@UseGuards(JwtStrategy, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.RESTAURANT_ADMIN)
  @Post()
  create(@Body() dto: CreateProductDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user.tenantId);
  }

  @Get('restaurant/:idRestaurant')
  findAllByRestaurant(
    @CurrentUser() user: RequestUser,
    @Param('idRestaurant') idRestaurant: string,
  ) {
    return this.service.findAllByRestaurant(user.tenantId, idRestaurant);
  }

  @Get(':idProduct')
  findOne(
    @Param('idProduct') idProduct: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(idProduct, user.tenantId);
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.RESTAURANT_ADMIN)
  @Patch(':idProduct')
  update(
    @Param('idProduct') idProduct: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(idProduct, dto, user.tenantId);
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.RESTAURANT_ADMIN)
  @Delete(':idProduct')
  remove(
    @Param('idProduct') idProduct: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.delete(idProduct, user.tenantId);
  }
}
