import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'fallback_secret_key',
    });
  }

  async validate(payload: JwtPayload) {
    const { sub, tenantId } = payload;

    const user = await this.prisma.user.findFirst({
      where: {
        idUser: sub,
        idTenant: tenantId,
        isActive: true,
      },
      include: {
        tenant: true,
      },
    });

    if (!user) throw new UnauthorizedException('Invalid token');

    if (!user.isActive) throw new ForbiddenException('User is inactive');

    if (!user.tenant.isActive)
      throw new ForbiddenException('Tenant is inactive');

    return {
      idUser: user.idUser,
      idTenant: user.idTenant,
      role: user.role,
      deviceId: payload.deviceId,
    };
  }
}
