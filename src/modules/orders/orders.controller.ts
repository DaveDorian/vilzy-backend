import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Tenant } from 'src/common/decorators/tenant.decorator';
import { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @Tenant() tenantId: string,
    @Req() req: RequestWithUser,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(tenantId, req.user.userId, dto);
  }

  @Get('me')
  myOrders(@Tenant() tenantId: string, @Req() req: RequestWithUser) {
    return this.ordersService.findMyOrders(tenantId, req.user.userId);
  }

  @Post(':id/assign/:driverId')
  assignDriver(
    @Tenant() tenantId: string,
    @Param('id') orderId: string,
    @Param('driverId') driverId: string,
  ) {
    return this.ordersService.assignDriver(tenantId, orderId, driverId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(+id, updateOrderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(+id);
  }
}
