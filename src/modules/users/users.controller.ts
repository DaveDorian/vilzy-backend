import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtStrategy } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from 'src/generated/prisma/enums';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { RequestUser } from 'src/common/interfaces/request-user.interface';

@UseGuards(JwtStrategy, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.RESTAURANT_ADMIN)
  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.TENANT_ADMIN, Role.RESTAURANT_ADMIN)
  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.service.findAll(user.tenantId);
  }

  @Get(':idUser')
  findOne(@Param('idUser') idUser: string, @CurrentUser() user: RequestUser) {
    return this.service.findOne(idUser, user.tenantId);
  }

  @Patch(':idUser')
  update(
    @Param('idUser') idUser: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(idUser, dto, user.tenantId);
  }

  @Patch(':idUser/status/:state')
  toggle(
    @Param('idUser') idUser: string,
    @Param('state') state: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.toggleActive(idUser, user.tenantId, state === 'true');
  }
}
