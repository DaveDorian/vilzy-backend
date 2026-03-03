import {
  Controller,
  UseGuards,
  Post,
  Body,
  Patch,
  Param,
} from '@nestjs/common';
import { JwtStrategy } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RequestUser } from 'src/common/interfaces/request-user.interface';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { AssignDriverDto } from './dto/assign-driver.dto';

@UseGuards(JwtStrategy)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: RequestUser) {
    return this.ordersService.create(dto, user);
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id') idOrder: string,
    @Body() dto: ChangeOrderStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ordersService.changeStatus(idOrder, dto, user);
  }

  @Patch(':id/assign-driver')
  assignDriver(
    @Param('id') idOrder: string,
    @Body() dto: AssignDriverDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ordersService.assignDriver(idOrder, dto, user);
  }
}
