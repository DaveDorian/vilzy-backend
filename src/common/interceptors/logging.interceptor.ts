import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    return next
      .handle()
      .pipe(
        tap(() =>
          console.log(`${method} ${url} ${Date.now() - request.startTime}ms`),
        ),
      );
  }
}
