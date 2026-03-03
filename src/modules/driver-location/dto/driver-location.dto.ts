import { ApiProperty } from '@nestjs/swagger';
import { IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';

export class UpdateDriverLocationDto {
  @ApiProperty({ example: -17.3895 })
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: -66.1568 })
  @IsLongitude()
  lng!: number;

  // idOrder opcional: si está activo en un pedido, también notifica al customer
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  idOrder?: string;
}
