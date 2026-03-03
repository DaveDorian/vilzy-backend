import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
  IsEnum,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum OrderStatus {
  CREATED = 'CREATED',
  PENDING = 'PENDING',
  SEARCHING_DRIVER = 'SEARCHING_DRIVER',
  OFFERED_TO_DRIVER = 'OFFERED_TO_DRIVER',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  ASSIGNED = 'ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

// Transiciones de estado válidas por rol
export const VALID_TRANSITIONS: Record<string, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.SEARCHING_DRIVER, OrderStatus.CANCELLED],
  [OrderStatus.SEARCHING_DRIVER]: [
    OrderStatus.OFFERED_TO_DRIVER,
    OrderStatus.FAILED,
  ],
  [OrderStatus.OFFERED_TO_DRIVER]: [
    OrderStatus.CONFIRMED,
    OrderStatus.SEARCHING_DRIVER,
  ],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.ASSIGNED],
  [OrderStatus.ASSIGNED]: [OrderStatus.PICKED_UP],
  [OrderStatus.PICKED_UP]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.FAILED]: [],
};

// ─── Create Order ─────────────────────────────────────────────────────────────

export class CreateOrderItemDto {
  @ApiProperty({ example: 'uuid-del-producto' })
  @IsUUID()
  idProduct!: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'uuid-del-restaurant' })
  @IsUUID()
  idRestaurant!: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiProperty({ example: 'Av. Heroínas 456, Cochabamba' })
  @IsString()
  @IsNotEmpty()
  deliveryAddress!: string;

  @ApiProperty({ example: -17.3895 })
  @IsLatitude()
  deliveryLat!: number;

  @ApiProperty({ example: -66.1568 })
  @IsLongitude()
  deliveryLng!: number;

  @ApiPropertyOptional({ example: -17.391 })
  @IsOptional()
  @IsLatitude()
  customerLat?: number;

  @ApiPropertyOptional({ example: -66.158 })
  @IsOptional()
  @IsLongitude()
  customerLng?: number;
}

// ─── Cancel Order ─────────────────────────────────────────────────────────────

export class CancelOrderDto {
  @ApiPropertyOptional({ example: 'El cliente cambió de opinión' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ─── List Orders (query params) ───────────────────────────────────────────────

export class ListOrdersQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}
