import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  CancelOrderDto,
  ListOrdersQueryDto,
} from './dto/order.dto';
import { JwtStrategy } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from 'src/generated/prisma/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RequestUser } from 'src/common/interfaces/request-user.interface';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtStrategy, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ─── POST /orders — customer crea un pedido ────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.CUSTOMER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new order (customer only)' })
  @ApiResponse({
    status: 201,
    description: 'Order created and dispatch started',
  })
  @ApiResponse({ status: 400, description: 'Invalid products or restaurant' })
  @ApiResponse({ status: 404, description: 'Restaurant not found' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: RequestUser) {
    return this.ordersService.create(dto, user);
  }

  // ─── GET /orders/me — pedidos del customer autenticado ────────────────────

  @Get('me')
  @Roles(Role.CUSTOMER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get orders of the authenticated customer' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of customer orders',
  })
  findMyOrders(
    @CurrentUser() user: RequestUser,
    @Query() query: ListOrdersQueryDto,
  ) {
    return this.ordersService.findMyOrders(user, query);
  }

  // ─── GET /orders/driver/me — pedidos del driver autenticado ───────────────

  @Get('driver/me')
  @Roles(Role.DRIVER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get orders assigned to the authenticated driver' })
  @ApiResponse({ status: 200, description: 'Paginated list of driver orders' })
  findMyDriverOrders(
    @CurrentUser() user: RequestUser,
    @Query() query: ListOrdersQueryDto,
  ) {
    return this.ordersService.findMyDriverOrders(user, query);
  }

  // ─── GET /orders/tenant — todos los pedidos del tenant (admin) ────────────

  @Get('tenant')
  @Roles(Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get all orders for the tenant (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of all tenant orders',
  })
  findByTenant(
    @CurrentUser() user: RequestUser,
    @Query() query: ListOrdersQueryDto,
  ) {
    return this.ordersService.findByTenant(user, query);
  }

  // ─── GET /orders/restaurant/:idRestaurant — pedidos por restaurant ─────────

  @Get('restaurant/:idRestaurant')
  @Roles(Role.RESTAURANT_ADMIN, Role.TENANT_ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get orders for a specific restaurant' })
  @ApiParam({ name: 'idRestaurant', type: String })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of restaurant orders',
  })
  findByRestaurant(
    @Param('idRestaurant') idRestaurant: string,
    @CurrentUser() user: RequestUser,
    @Query() query: ListOrdersQueryDto,
  ) {
    return this.ordersService.findByRestaurant(idRestaurant, user, query);
  }

  // ─── GET /orders/:idOrder — detalle de un pedido ──────────────────────────

  @Get(':idOrder')
  @ApiOperation({ summary: 'Get order detail by ID' })
  @ApiParam({ name: 'idOrder', type: String })
  @ApiResponse({ status: 200, description: 'Order detail' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  findOne(@Param('idOrder') idOrder: string, @CurrentUser() user: RequestUser) {
    return this.ordersService.findOne(idOrder, user);
  }

  // ─── PATCH /orders/:idOrder/cancel — cancelar pedido ──────────────────────

  @Patch(':idOrder/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiParam({ name: 'idOrder', type: String })
  @ApiResponse({ status: 200, description: 'Order cancelled' })
  @ApiResponse({
    status: 400,
    description: 'Order cannot be cancelled in its current state',
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  cancel(
    @Param('idOrder') idOrder: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ordersService.cancel(idOrder, dto, user);
  }
}
