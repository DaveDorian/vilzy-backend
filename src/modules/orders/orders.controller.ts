import {
  Controller,
  UseGuards,
  Post,
  Body,
  Patch,
  Param,
  Get,
} from '@nestjs/common';
import { JwtStrategy } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RequestUser } from 'src/common/interfaces/request-user.interface';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from 'src/generated/prisma/enums';

@UseGuards(JwtStrategy)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(Role.TENANT_ADMIN, Role.RESTAURANT_ADMIN)
  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: RequestUser) {
    return this.ordersService.create(dto, user);
  }

  @Roles(Role.TENANT_ADMIN, Role.RESTAURANT_ADMIN)
  @Patch(':id/status')
  changeStatus(
    @Param('id') idOrder: string,
    @Body() dto: ChangeOrderStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ordersService.changeStatus(idOrder, dto, user);
  }

  @Roles(Role.RESTAURANT_ADMIN)
  @Patch(':id/assign-driver')
  assignDriver(
    @Param('id') idOrder: string,
    @Body() dto: AssignDriverDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ordersService.assignDriver(idOrder, dto, user);
  }

  @Roles(Role.RESTAURANT_ADMIN, Role.DRIVER)
  @Patch(':id/complete-order')
  completeOrder(
    @Param('id') idOrder: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ordersService.completeOrder(idOrder, user);
  }

  @Roles(Role.RESTAURANT_ADMIN, Role.CUSTOMER, Role.DRIVER)
  @Get('my-orders')
  getMyOrders(@CurrentUser() user: RequestUser) {
    return this.ordersService.getMyOrders(user);
  }
}
