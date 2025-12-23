import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserRole } from '../../../domain/entities/user.entity';
import { RedisService } from '../../cache/redis.service';
import { RegisterDto, LoginDto } from '../../../domain/dto/auth';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: jest.Mocked<JwtService>;
  let redisService: jest.Mocked<RedisService>;
  let configService: jest.Mocked<ConfigService>;

  const mockJwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret';
      if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
      return null;
    }),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
    redisService = module.get(RedisService);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user using JwtService for tokens', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@test.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockUser = {
        id: '1',
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        role: UserRole.CUSTOMER,
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockUserRepository.create.mockReturnValue(mockUser as any);
      mockUserRepository.save.mockResolvedValue(mockUser as any);
      mockJwtService.signAsync.mockResolvedValue('token');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(registerDto.email);
      expect(jwtService.signAsync).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      const registerDto: RegisterDto = {
        email: 'existing@test.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockUserRepository.findOne.mockResolvedValue({
        id: '1',
        email: registerDto.email,
      } as any);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('should login with valid credentials using JwtService', async () => {
      const loginDto: LoginDto = {
        email: 'user@test.com',
        password: 'password123',
      };

      const mockUser = {
        id: '1',
        email: loginDto.email,
        password: 'hashed-password',
        isActive: true,
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.CUSTOMER,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(jwtService.signAsync).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'user@test.com',
        password: 'wrong-password',
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if account is inactive', async () => {
      const loginDto: LoginDto = {
        email: 'user@test.com',
        password: 'password123',
      };

      const mockUser = {
        id: '1',
        email: loginDto.email,
        password: 'hashed-password',
        isActive: false,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens using JwtService and RedisService', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockPayload = { sub: 'user-1', email: 'user@test.com' };
      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        isActive: true,
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.CUSTOMER,
      };

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockRedisService.get.mockResolvedValue(null);
      mockUserRepository.findOne.mockResolvedValue(mockUser as any);
      mockJwtService.signAsync.mockResolvedValue('new-token');

      const result = await service.refreshToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(jwtService.verify).toHaveBeenCalled();
      expect(redisService.get).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if token is blacklisted in RedisService', async () => {
      const refreshToken = 'blacklisted-token';
      const mockPayload = { sub: 'user-1' };

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockRedisService.get.mockResolvedValue(true);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
