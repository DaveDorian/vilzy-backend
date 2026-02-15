import { UserEntity } from '../entities/user.entity';

export interface UserRepository {
  create(user: UserEntity): Promise<UserEntity>;
  findByEmail(email: string): Promise<UserEntity | null>;
}
