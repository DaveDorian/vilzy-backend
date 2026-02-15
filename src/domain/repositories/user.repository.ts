import { TokenEntity } from '../entities/token.entity';
import { UserEntity } from '../entities/user.entity';

export interface UserRepository {
  create(user: UserEntity): Promise<UserEntity>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(userId: string): Promise<UserEntity | null>;
  saveRefreshToken(
    userId: string,
    refreshToken: string | null,
    expiresAt: Date,
    deviceId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<void>;
  refreshTokens(userId: string, deviceId: string): Promise<TokenEntity[]>;
  updateRefreshToken(idValidToken: string): Promise<void>;
  updateRefreshTokenMany(userId: string): Promise<void>;
  getActiveSessions(userId: string): Promise<any[]>;
}
