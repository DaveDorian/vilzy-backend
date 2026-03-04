import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/infrastructure/prisma/prisma.service';
import { ROLE_HIERARCHY } from '../auth/constants/role-hierarchy';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { RequestUser } from 'src/common/interfaces/request-user.interface';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, currenUser: RequestUser) {
    const creatorLevel = ROLE_HIERARCHY[currenUser.role as Role];
    const targetLevel = ROLE_HIERARCHY[createUserDto.role as Role];

    if (targetLevel >= creatorLevel) {
      throw new Error(
        'You cannot create a user with the same or higher role than yours.',
      );
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        idTenant: currenUser.tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { idTenant: tenantId },
      select: {
        idUser: true,
        name: true,
        surname: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findOne(idUser: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { idUser, idTenant: tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(idUser: string, dto: UpdateUserDto, tenantId: string) {
    await this.findOne(idUser, tenantId); // Ensure user exists

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { idUser },
      data: dto,
    });
  }

  async toggleActive(idUser: string, tenantId: string, isActive: boolean) {
    await this.findOne(idUser, tenantId);

    return this.prisma.user.update({
      where: { idUser },
      data: {
        isActive,
      },
    });
  }
}
