import { IsNumber, IsString } from 'class-validator';

export class UpdateLocationDto {
  @IsString()
  userId!: string;

  @IsString()
  tenantId!: string;

  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;
}
