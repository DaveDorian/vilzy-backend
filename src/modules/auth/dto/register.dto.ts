import { IsEmail, IsEnum, IsNotEmpty, MinLength } from 'class-validator';
import { Role } from 'generated/prisma/enums';

export class RegisterDto {
  @IsNotEmpty()
  name!: string;

  @IsNotEmpty()
  surname!: string;

  @IsEmail()
  email!: string;

  @IsNotEmpty()
  ci!: string;

  @MinLength(6)
  password!: string;

  @IsEnum(Role)
  role!: Role;
}
