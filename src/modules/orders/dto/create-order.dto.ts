import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  idRestaurant!: string;

  @IsString()
  @IsNotEmpty()
  deliveryAddress!: string;

  @IsOptional()
  @IsNumber()
  deliveryLat?: number;

  @IsOptional()
  @IsNumber()
  deliveryLng?: number;

  @IsNumber()
  subtotal!: number;

  @IsNumber()
  deliveryFee!: number;

  @IsNumber()
  total!: number;
}
