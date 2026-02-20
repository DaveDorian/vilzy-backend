import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}
