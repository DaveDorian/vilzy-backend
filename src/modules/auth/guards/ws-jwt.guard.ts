import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    
    const authHeader = client.handshake.headers.authorization as string;
    let token = client.handshake.auth?.token;

    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      throw new WsException('Missing authentication token');
    }

    try {
      const payload: JwtPayload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'fallback_secret_key',
      });

      const user = await this.prisma.user.findFirst({
        where: {
          idUser: payload.sub,
          idTenant: payload.tenantId,
          isActive: true,
        },
        include: {
          tenant: true,
        },
      });

      if (!user) {
        throw new WsException('User not found or inactive');
      }

      if (!user.isActive) {
        throw new WsException('User is inactive');
      }

      if (!user.tenant.isActive) {
        throw new WsException('Tenant is inactive');
      }

      client.user = {
        sub: user.idUser,
        tenantId: user.idTenant,
        role: user.role,
        email: user.email,
        deviceId: payload.deviceId,
        restaurantId: payload.restaurantId,
      };

      return true;
    } catch (err) {
      throw new WsException('Invalid authentication token');
    }
  }
}
