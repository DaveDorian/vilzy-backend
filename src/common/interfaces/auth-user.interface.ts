import { Role } from 'generated/prisma/enums';

export interface AuthUser {
  userId: string;
  role: Role;
}
