import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { UsersService } from './users.service';
import { User } from '../../../domain/entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockUserRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return users with pagination', async () => {
      const mockUsers = [
        { id: '1', email: 'user1@test.com', firstName: 'John' },
        { id: '2', email: 'user2@test.com', firstName: 'Jane' },
      ];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockUsers, 2]);

      const result = await service.findAll({ limit: 10, offset: 0 });

      expect(result.data).toEqual(mockUsers);
      expect(result.total).toBe(2);
      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should filter by search term', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ search: 'john' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should filter by role', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ role: 'admin' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.role = :role', { role: 'admin' });
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const mockUser = { id: '1', email: 'user@test.com', firstName: 'John' };

      mockUserRepository.findOne.mockResolvedValue(mockUser as any);

      const result = await service.findOne('1');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne('invalid');

      expect(result).toBeNull();
    });
  });
});

