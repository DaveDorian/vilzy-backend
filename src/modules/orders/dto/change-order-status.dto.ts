import { IsString } from 'class-validator';

export class ChangeOrderStatusDto {
  @IsString()
  status!: string;
}
