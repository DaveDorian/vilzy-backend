import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();

    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer', '');

    if (!token) throw new UnauthorizedException('Missing Token');

    try {
      const payload = await this.jwtService.verifyAsync(token);

      client.data.user = payload;

      return true;
    } catch {
      client.disconnect();
      throw new UnauthorizedException('Invalid Token');
    }
  }
}
