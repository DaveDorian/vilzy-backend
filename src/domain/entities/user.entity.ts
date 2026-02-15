import { Role } from 'generated/prisma/enums';

export class UserEntity {
  constructor(
    public id: string | null,
    public ci: string,
    public name: string,
    public surname: string,
    public email: string,
    public password?: string,
    public role: Role = Role.CLIENT,
    public refreshToken?: string,
  ) {}
}
