import { Role } from '@prisma/client';

export const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 6,
  TENANT_ADMIN: 5,
  RESTAURANT_ADMIN: 4,
  RESTAURANT_CASHIER: 3,
  DRIVER: 2,
  CUSTOMER: 1,
};
