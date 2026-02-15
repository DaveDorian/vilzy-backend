import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshTokens(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('sessions')
  getSessions(@Req() req: any) {
    return this.authService.getSessions(req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('sessions/:id')
  revokeSession(@Param('id') id: string, @Req() req: any) {
    return this.authService.logout(id);
  }

  @Post('register')
  register(@Body() body: RegisterDto) {
    return `${body}`; //this.authService.register(body);
  }
}
