import { Injectable } from '@nestjs/common';
import { TokenEntity } from 'src/domain/entities/token.entity';
import { UserEntity } from 'src/domain/entities/user.entity';
import { UserRepository } from 'src/domain/repositories/user.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserPrismaRepository implements UserRepository {
  constructor(private prisma: PrismaService) {}

  async create(user: UserEntity): Promise<UserEntity> {
    const created = await this.prisma.user.create({
      data: {
        ci: user.ci,
        name: user.name,
        surname: user.surname,
        email: user.email,
        password: user.password!,
        role: user.role,
      },
    });

    return new UserEntity(
      created.idUser,
      created.ci,
      created.name,
      created.email,
      created.password,
    );
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) return null;

    return new UserEntity(
      user.idUser,
      user.ci,
      user.name,
      user.email,
      user.password,
    );
  }

  async findById(userId: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { idUser: userId },
    });

    if (!user) return null;

    return new UserEntity(
      user.idUser,
      user.ci,
      user.name,
      user.surname,
      user.email,
      user.password,
      user.role,
    );
  }

  async saveRefreshToken(
    userId: string,
    refreshToken: string | null,
    expiresAt: Date,
    deviceId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken!,
        expiresAt,
        idUser: userId,
        deviceId,
        userAgent,
        ipAddress,
      },
    });
  }

  async refreshTokens(
    userId: string,
    deviceId: string,
  ): Promise<TokenEntity[]> {
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        idUser: userId,
        deviceId: deviceId,
        revoked: false,
      },
    });

    tokens.map((token) => {
      new TokenEntity(
        token.idRefreshToken,
        token.token,
        token.idUser,
        token.revoked,
        token.expiresAt,
      );
    });

    return tokens;
  }

  async updateRefreshToken(idValidToken: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { idRefreshToken: idValidToken },
      data: { revoked: true },
    });
  }

  async updateRefreshTokenMany(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { idUser: userId },
      data: { revoked: true },
    });
  }

  async getActiveSessions(userId: string): Promise<any[]> {
    return this.prisma.refreshToken.findMany({
      where: {
        idUser: userId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      select: {
        idRefreshToken: true,
        deviceId: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
      },
    });
  }
}
