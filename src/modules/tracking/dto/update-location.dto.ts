import { IsNumber, IsString } from 'class-validator';

export class UpdateLocationDto {
  @IsString()
  orderId!: string;

  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;
}
