import { Role } from 'src/generated/prisma/enums';

export class UserEntity {
  constructor(
    public id: string | null,
    public ci: string,
    public name: string,
    public surname: string,
    public email: string,
    public password?: string,
    public role: Role = Role.CUSTOMER,
    public isActive?: boolean,
    public idRestaurant?: string,
    public createdAt?: Date,
    public updatedAt?: Date,
    public refreshToken?: string,
    public idTenant?: string,
  ) {}
}
