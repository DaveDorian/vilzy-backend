import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRepository } from 'src/domain/repositories/user.repository';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { User } from 'src/generated/prisma/client';

@Injectable()
export class AuthService {
  constructor(
    @Inject('UserRepository')
    private userRepository: UserRepository,
    private jwtService: JwtService,
  ) {}

  private async getTokens(user: User) {
    const payload = {
      sub: user.idUser,
      email: user.email,
      role: user.role,
      tenantId: user.idTenant,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async getSessions(userId: string) {
    return this.userRepository.getActiveSessions(userId);
  }

  private async saveSession(
    userId: string,
    refreshToken: string,
    deviceId: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    const decoded = this.jwtService.decode(refreshToken) as any;
    const expiresAt = new Date(decoded.exp * 1000);

    await this.userRepository.saveRefreshToken(
      userId,
      hashedToken,
      expiresAt,
      deviceId,
      userAgent,
      ipAddress,
    );
  }

  async refreshTokens(dto: RefreshDto) {
    const decoded = this.jwtService.verify(dto.refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    const sessions = await this.userRepository.refreshTokens(
      decoded.sub,
      dto.deviceId,
    );

    let validSession = null;

    for (const session of sessions) {
      const match = await bcrypt.compare(dto.refreshToken, session.token);
      if (match) {
        validSession = session;
        break;
      }
    }

    if (!validSession) {
      throw new ForbiddenException('Invalid refresh token');
    }

    if (validSession.expiresAt < new Date()) {
      throw new ForbiddenException('Token expired');
    }

    if (validSession.revoked) {
      await this.userRepository.updateRefreshTokenMany(decoded.sub);

      throw new ForbiddenException('Session compromised');
    }

    await this.userRepository.updateRefreshToken(validSession.idRefreshToken);

    const tokens = await this.getTokens(decoded);

    await this.saveSession(decoded.sub, tokens.refreshToken, dto.deviceId);

    return tokens;
  }

  async validateUser(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(password, user.password!);

    if (!valid) throw new UnauthorizedException();

    return user;
  }

  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    const user = await this.validateUser(dto.email, dto.password);

    const tokens = await this.getTokens({
      name: user.name,
      idUser: user.id!,
      surname: user.surname,
      ci: user.ci,
      email: user.email,
      password: user.password!,
      role: user.role,
      isActive: user.isActive!,
      createdAt: user.createdAt!,
      updatedAt: user.updatedAt!,
      idRestaurant: user.idRestaurant!,
      idTenant: user.idTenant!,
    });

    //Save session
    await this.saveSession(
      user.id!,
      tokens.refreshToken,
      dto.deviceId,
      userAgent,
      ip,
    );

    return tokens;
  }

  //revokeSession
  async logout(tokenId: string) {
    await this.userRepository.updateRefreshToken(tokenId);
  }

  async logoutAll(userId: string) {
    await this.userRepository.updateRefreshTokenMany(userId);
  }
}
