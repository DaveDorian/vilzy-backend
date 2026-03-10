import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class RegisterUserDto {
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
  @IsString()
  password!: string;

  @ApiProperty()
  @IsString()
  role!: Role;

  @ApiProperty()
  @IsString()
  deviceId!: string;

  @ApiProperty()
  @IsOptional()
  tenantId?: string;
}
