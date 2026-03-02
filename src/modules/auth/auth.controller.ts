import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtStrategy } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @UseGuards(JwtStrategy)
  @Post('logout')
  logout(@Req() req: any) {
    const { userId, deviceId } = req.user;
    return this.authService.logout(userId, deviceId);
  }

  @UseGuards(JwtStrategy)
  @Post('logout-all')
  logoutAll(@Req() req: any) {
    const { userId } = req.user;
    return this.authService.logoutAllSessions(userId);
  }
}
