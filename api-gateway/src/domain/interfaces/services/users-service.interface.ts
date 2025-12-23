import { User } from '../../entities/user.entity';

export interface IUsersService {
  findAll(options?: {
    limit?: number;
    offset?: number;
    search?: string;
    role?: string;
    withDeleted?: boolean;
  }): Promise<{ data: User[]; total: number }>;
  findOne(id: string): Promise<User>;
}

