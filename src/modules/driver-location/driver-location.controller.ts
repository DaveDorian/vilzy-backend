import {
  Controller,
  Post,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import { DriverLocationService } from './driver-location.service';
import { UpdateDriverLocationDto } from './dto/driver-location.dto';
import { JwtStrategy } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from 'src/generated/prisma/enums';
import { RequestUser } from 'src/common/interfaces/request-user.interface';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@ApiTags('Driver Location')
@ApiBearerAuth()
@UseGuards(JwtStrategy, RolesGuard)
@Roles(Role.DRIVER)
@Controller('driver-location')
export class DriverLocationController {
  constructor(private readonly driverLocationService: DriverLocationService) {}

  // POST /driver-location — actualiza posición GPS del driver
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update driver GPS location' })
  @ApiResponse({ status: 200, description: 'Location updated in PostGIS' })
  updateLocation(
    @Body() dto: UpdateDriverLocationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.driverLocationService.updateLocation(dto, user);
  }

  // PATCH /driver-location/online — driver se pone disponible
  @Patch('online')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set driver as online and available' })
  async setOnline(@CurrentUser() user: RequestUser) {
    await this.driverLocationService.setOnline(user.idUser);
    return { isOnline: true };
  }

  // PATCH /driver-location/offline — driver se pone fuera de línea
  @Patch('offline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set driver as offline' })
  async setOffline(@CurrentUser() user: RequestUser) {
    await this.driverLocationService.setOffline(user.idUser);
    return { isOnline: false };
  }
}
