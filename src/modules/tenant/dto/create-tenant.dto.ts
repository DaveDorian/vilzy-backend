import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { TenantType } from 'src/generated/prisma/enums';

export class CreateTenantDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: TenantType })
  @IsEnum(TenantType)
  type!: TenantType;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  commissionRate!: number;

  @ApiProperty()
  allowOwnDrivers!: boolean;
}
