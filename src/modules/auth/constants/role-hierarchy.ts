import { Role } from 'src/generated/prisma/enums';

export const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 5,
  TENANT_ADMIN: 4,
  RESTAURANT_ADMIN: 3,
  DRIVER: 2,
  CUSTOMER: 1,
};
