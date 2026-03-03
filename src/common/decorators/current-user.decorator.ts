import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from '../interfaces/request-user.interface';

export const CurrentUser = createParamDecorator(
  (ctx: ExecutionContext): RequestUser => {
    const req = ctx.switchToHttp().getRequest();

    return req.user;
  },
);
