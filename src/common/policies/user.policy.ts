import { Role } from 'src/generated/prisma/enums';

export class UserPolicy {
  static canUpdate(currentUser: any, targetUserId: number): boolean {
    if (currentUser.role === Role.SUPER_ADMIN) return true;

    if (currentUser.role === Role.ADMIN) return true;

    if (currentUser.role === Role.CLIENT)
      return currentUser.sub === targetUserId;

    return false;
  }
}
