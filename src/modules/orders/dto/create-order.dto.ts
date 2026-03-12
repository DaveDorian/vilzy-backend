import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional } from 'class-validator';

export class CreateOrderDto {
  @IsArray()
  items!: { productId: string; quantity: number }[];

  @ApiProperty()
  @IsOptional()
  restaurantId?: string;

  @ApiProperty()
  @IsOptional()
  tenantId?: string;
}
