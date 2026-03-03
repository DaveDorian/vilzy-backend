import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

// ─── Rechazar oferta ──────────────────────────────────────────────────────────

export class RejectOfferDto {
  @ApiPropertyOptional({
    example: 'Estoy muy lejos del restaurant',
    description: 'Motivo opcional del rechazo',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ─── Actualizar estado del pedido ────────────────────────────────────────────
// El driver solo puede mover el pedido por su parte del flujo:
// CONFIRMED → PICKED_UP → DELIVERED
// No puede saltar estados ni retroceder.

export enum DriverOrderTransition {
  PICKED_UP = 'PICKED_UP',
  DELIVERED = 'DELIVERED',
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: DriverOrderTransition,
    description:
      'New status. Driver can only move: CONFIRMED→PICKED_UP or PICKED_UP→DELIVERED',
  })
  @IsEnum(DriverOrderTransition)
  status!: DriverOrderTransition;
}
