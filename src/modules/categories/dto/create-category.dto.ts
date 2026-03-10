import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsUUID } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsInt()
  displayOrder!: number;

  @ApiProperty()
  @IsUUID()
  idRestaurant!: string;
}
