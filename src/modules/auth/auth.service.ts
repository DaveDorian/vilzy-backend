import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(dto: LoginDto) {
    const { email, password, tenantId } = dto;

    const user = await this.prisma.user.findFirst({
      where: {
        email,
        idTenant: tenantId,
      },
      include: {
        tenant: true,
      },
    });

    if (!user) throw new Error('Invalid credentials');

    if (!user.isActive) throw new Error('User is inactive');

    if (!user.tenant.isActive) throw new Error('Tenant is inactive');

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) throw new Error('Invalid credentials');

    const deviceId = uuidv4();

    const payload = {
      sub: user.idUser,
      tenantId: user.idTenant,
      role: user.role,
      deviceId,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    await this.saveRefreshToken(user.idUser, refreshToken, deviceId);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(
    userId: string,
    refreshToken: string,
    deviceId: string,
  ) {
    const hashedToken = await bcrypt.hash(refreshToken, 10);

    await this.prisma.refreshToken.create({
      data: {
        idUser: userId,
        token: hashedToken,
        deviceId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
  }

  async refreshToken(oldRefreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(oldRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const { sub, tenantId, role, deviceId } = payload;

      const storedToken = await this.prisma.refreshToken.findFirst({
        where: {
          idUser: sub,
          deviceId,
          revoked: false,
        },
      });

      if (!storedToken) {
        await this.prisma.refreshToken.updateMany({
          where: {
            idUser: sub,
          },
          data: { revoked: true },
        });

        throw new Error('Invalid refresh token');
      }

      if (storedToken.expiresAt < new Date())
        throw new Error('Refresh token expired');

      const tokenMatch = await bcrypt.compare(
        oldRefreshToken,
        storedToken.token,
      );

      if (!tokenMatch) throw new Error('Invalid refresh token');

      await this.prisma.refreshToken.update({
        where: { idRefreshToken: storedToken.idRefreshToken },
        data: { revoked: true },
      });

      const newPayload = { sub, tenantId, role, deviceId };

      const newAccessToken = await this.jwtService.signAsync(newPayload);

      const newRefreshToken = await this.jwtService.signAsync(newPayload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      });

      await this.saveRefreshToken(sub, newRefreshToken, deviceId);

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
}
