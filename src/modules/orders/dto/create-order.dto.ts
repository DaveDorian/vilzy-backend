import { IsArray } from 'class-validator';

export class CreateOrderDto {
  @IsArray()
  items!: { idProduct: string; quantity: number }[];
}
