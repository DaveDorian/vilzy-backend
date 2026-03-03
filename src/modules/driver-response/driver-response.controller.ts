import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

import { DriverResponseService } from './driver-response.service';
import {
  RejectOfferDto,
  UpdateOrderStatusDto,
} from './dto/driver-response.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtStrategy } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from 'src/generated/prisma/enums';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RequestUser } from 'src/common/interfaces/request-user.interface';

@ApiTags('Driver Response')
@ApiBearerAuth()
@UseGuards(JwtStrategy, RolesGuard)
@Roles(Role.DRIVER)
@Controller('driver/orders')
export class DriverResponseController {
  constructor(private readonly driverResponseService: DriverResponseService) {}

  // ─── GET /driver/orders/offer — ver oferta pendiente activa ───────────────
  // El driver llama a esto al abrir la app para ver si hay una oferta esperándolo

  @Get('offer')
  @ApiOperation({
    summary: 'Get current pending offer for the driver',
    description:
      'Returns the active offer if one exists. Returns null if no offer is pending. ' +
      'Useful when the driver reconnects and may have missed the WebSocket event.',
  })
  @ApiResponse({ status: 200, description: 'Offer details or null' })
  getPendingOffer(@CurrentUser() user: RequestUser) {
    return this.driverResponseService.getPendingOffer(user);
  }

  // ─── POST /driver/orders/:idOrder/accept — aceptar oferta ────────────────

  @Post(':idOrder/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept an order offer (HTTP fallback)',
    description:
      'Use this endpoint when the driver is not connected via WebSocket. ' +
      'If the offer has expired or was already taken, returns 409.',
  })
  @ApiParam({ name: 'idOrder', type: String })
  @ApiResponse({
    status: 200,
    description: 'Order confirmed and assigned to driver',
  })
  @ApiResponse({
    status: 403,
    description: 'Offer was not sent to this driver',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({
    status: 409,
    description: 'Offer expired or no longer available',
  })
  acceptOffer(
    @Param('idOrder') idOrder: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.driverResponseService.acceptOffer(idOrder, user);
  }

  // ─── POST /driver/orders/:idOrder/reject — rechazar oferta ───────────────

  @Post(':idOrder/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject an order offer (HTTP fallback)',
    description:
      'Rejects the offer and triggers dispatch to search the next available driver.',
  })
  @ApiParam({ name: 'idOrder', type: String })
  @ApiResponse({
    status: 200,
    description: 'Offer rejected, searching next driver',
  })
  @ApiResponse({
    status: 403,
    description: 'Offer was not sent to this driver',
  })
  @ApiResponse({
    status: 409,
    description: 'Order is no longer in OFFERED_TO_DRIVER state',
  })
  rejectOffer(
    @Param('idOrder') idOrder: string,
    @Body() dto: RejectOfferDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.driverResponseService.rejectOffer(idOrder, dto, user);
  }

  // ─── PATCH /driver/orders/:idOrder/status — cambiar estado del pedido ─────

  @Patch(':idOrder/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update order status by driver',
    description:
      'Driver can only advance the order through their part of the flow:\n\n' +
      '- `CONFIRMED` → `PICKED_UP` (driver recogió el pedido en el restaurant)\n' +
      '- `PICKED_UP` → `DELIVERED` (driver entregó al customer)\n\n' +
      'Any other transition will return 400.',
  })
  @ApiParam({ name: 'idOrder', type: String })
  @ApiResponse({
    status: 200,
    description: 'Status updated and customer notified via WebSocket',
  })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 403, description: 'You are not the assigned driver' })
  updateStatus(
    @Param('idOrder') idOrder: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.driverResponseService.updateOrderStatus(idOrder, dto, user);
  }
}
