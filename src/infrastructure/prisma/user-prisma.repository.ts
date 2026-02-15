import { Injectable } from '@nestjs/common';
import { UserEntity } from 'src/domain/entities/user.entity';
import { UserRepository } from 'src/domain/repositories/user.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserPrismaRepository implements UserRepository {
  constructor(private prisma: PrismaService) {}

  async create(user: UserEntity): Promise<UserEntity> {
    const created = await this.prisma.user.create({
      data: {
        ci: user.ci,
        name: user.name,
        surname: user.surname,
        email: user.email,
        password: user.password!,
        role: user.role,
      },
    });

    return new UserEntity(
      created.idUser,
      created.ci,
      created.name,
      created.email,
      created.password,
    );
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) return null;

    return new UserEntity(
      user.idUser,
      user.ci,
      user.name,
      user.email,
      user.password,
    );
  }
}
