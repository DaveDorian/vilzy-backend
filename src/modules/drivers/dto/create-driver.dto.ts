import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateDriverDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  surname!: string;

  @ApiProperty()
  @IsString()
  ci!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  role?: Role = 'DRIVER';

  @ApiProperty()
  @IsString()
  plateCar!: string;

  @ApiProperty()
  @IsString()
  typeCar!: string;

  @ApiProperty()
  @IsOptional()
  lat?: number;

  @ApiProperty()
  @IsOptional()
  lng?: number;
}
