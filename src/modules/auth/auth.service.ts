import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRepository } from 'src/domain/repositories/user.repository';

@Injectable()
export class AuthService {
  constructor(
    @Inject('UserRepository')
    private userRepository: UserRepository,
    private jwtService: JwtService,
  ) {}

  private async getTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
      ),
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: '7d',
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async saveRefreshToken(
    userId: string,
    refreshToken: string,
    expiresAt: Date,
    deviceId: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.saveRefreshToken(
      userId,
      hashedToken,
      expiresAt,
      deviceId,
      userAgent,
      ipAddress,
    );
  }

  async refreshTokens(
    userId: string,
    email: string,
    refreshToken: string,
    deviceId: string,
  ) {
    const tokens = await this.userRepository.refreshTokens(userId);

    let validToken = null;

    for (const token of tokens) {
      const match = await bcrypt.compare(refreshToken, token.token);
      if (match) {
        validToken = token;
        break;
      }
    }

    if (!validToken) {
      throw new ForbiddenException('Invalid refresh token');
    }

    if (validToken.expiresAt < new Date()) {
      throw new ForbiddenException('Token expired');
    }

    if (validToken.revoked) {
      await this.userRepository.updateRefreshTokenMany(userId);

      throw new ForbiddenException('Session compromised');
    }

    await this.userRepository.updateRefreshToken(validToken.idRefreshToken);

    const newTokens = await this.getTokens(userId, email);

    await this.saveRefreshToken(
      userId,
      newTokens.refreshToken,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      deviceId,
    );

    return newTokens;
  }

  async validateUser(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(password, user.password!);

    if (!valid) throw new UnauthorizedException();

    return user;
  }

  async login(email: string, password: string, deviceId: string) {
    const user = await this.validateUser(email, password);

    const tokens = await this.getTokens(user.id!, email);

    const decoded = this.jwtService.decode(tokens.refreshToken) as any;
    const expiresAt = new Date(decoded.exp * 1000);

    await this.saveRefreshToken(
      user.id!,
      tokens.refreshToken,
      expiresAt,
      deviceId,
    );

    return tokens;
  }

  async logout(tokenId: string) {
    await this.userRepository.updateRefreshToken(tokenId);
  }

  async logoutAll(userId: string) {
    await this.userRepository.updateRefreshTokenMany(userId);
  }
}
