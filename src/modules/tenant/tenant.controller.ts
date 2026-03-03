import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import { ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from 'src/generated/prisma/client';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@ApiTags('Tenant')
@UseGuards(JwtStrategy, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('tenants')
export class TenantController {
  constructor(private readonly service: TenantService) {}

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':idTenant')
  findOne(@Param('idTenant') idTenant: string) {
    return this.service.findOne(idTenant);
  }

  @Patch(':idTenant')
  update(@Param('idTenant') idTenant: string, @Body() dto: UpdateTenantDto) {
    return this.service.update(idTenant, dto);
  }

  @Patch(':idTenant/status/:state')
  toggleActive(
    @Param('idTenant') idTenant: string,
    @Param('state') state: string,
  ) {
    return this.service.toggleActive(idTenant, state === 'true');
  }
}
