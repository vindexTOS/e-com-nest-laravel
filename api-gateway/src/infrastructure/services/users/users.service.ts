import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { User } from '../../../domain/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(options: { limit?: number; offset?: number; search?: string; role?: string; withDeleted?: boolean } = {}): Promise<{ data: User[]; total: number }> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC');

    if (options.withDeleted) {
      query.withDeleted().andWhere('user.deletedAt IS NOT NULL');
    } else {
      query.andWhere('user.deletedAt IS NULL');
    }

    if (options.search) {
      const term = `%${options.search}%`;
      query.andWhere('(user.email ILIKE :term OR user.firstName ILIKE :term OR user.lastName ILIKE :term)', { term });
    }

    if (options.role) {
      query.andWhere('user.role = :role', { role: options.role });
    }

    if (options.limit) {
      query.limit(options.limit);
    }
    if (options.offset) {
      query.offset(options.offset);
    }

    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async restore(id: string): Promise<User> {
    const result = await this.userRepository.restore(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.userRepository.findOne({ where: { id } }) as Promise<User>;
  }

  async softDelete(id: string): Promise<void> {
    const result = await this.userRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}

