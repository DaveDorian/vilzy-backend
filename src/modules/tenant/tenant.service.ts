import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTenantDto) {
    return this.prisma.tenant.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(idTenant: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { idTenant },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    return tenant;
  }

  async update(idTenant: string, dto: UpdateTenantDto) {
    await this.findOne(idTenant);

    return this.prisma.tenant.update({
      where: { idTenant },
      data: dto,
    });
  }

  async toggleActive(idTenant: string, isActive: boolean) {
    await this.findOne(idTenant);

    return this.prisma.tenant.update({
      where: { idTenant },
      data: { isActive },
    });
  }
}
