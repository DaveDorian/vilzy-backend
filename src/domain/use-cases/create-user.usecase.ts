import { Role } from 'generated/prisma/enums';
import { UserEntity } from '../entities/user.entity';
import { UserRepository } from '../repositories/user.repository';
import * as bcrypt from 'bcrypt';

export class CreateUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(
    ci: string,
    name: string,
    surname: string,
    email: string,
    password: string,
    role: Role,
  ): Promise<UserEntity> {
    const existing = await this.userRepository.findByEmail(email);

    if (existing) {
      throw new Error('User already exists');
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = new UserEntity(null, ci, name, surname, email, hashed, role);

    return this.userRepository.create(user);
  }
}
