import {
  Body,
  Controller,
  Get,
  Param,
  ParseFloatPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DriversService } from './drivers.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateDriverDto } from './dto/create-driver.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RequestUser } from 'src/common/interfaces/request-user.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driverService: DriversService) {}

  @Roles(Role.RESTAURANT_ADMIN)
  @Post()
  create(@Body() dto: CreateDriverDto, @CurrentUser() user: RequestUser) {
    try {
      return this.driverService.createDriver(dto, user.tenantId);
    } catch (error) {
      console.log(error);
    }
  }

  @Roles(Role.DRIVER)
  @Patch(':status/change-status')
  changeStatus(@Param('status') status: boolean, @CurrentUser() user: RequestUser){
    return this.driverService.changeStatus(user.sub, status);
  }

  @Get('nearby')
  findNearbyDrivers(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('radius', ParseFloatPipe) radius: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.driverService.findNearbyDrivers(
      lat,
      lng,
      radius,
      user.tenantId,
    );
  }
}
