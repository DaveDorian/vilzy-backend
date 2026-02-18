import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  CHECK_POLICIES_KEY,
  PolicyHandler,
} from '../decorators/check-policies.decorator';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const handler = this.reflector.get<PolicyHandler>(
      CHECK_POLICIES_KEY,
      context.getHandler(),
    );

    if (!handler) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const allowed = handler(user, request);

    if (!allowed) {
      throw new ForbiddenException(
        'No tienes  permisos para realizar esta accion',
      );
    }

    return true;
  }
}
