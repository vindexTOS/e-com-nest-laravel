import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../../domain/entities/user.entity';
import { JwtPayload } from '../../authentication/jwt.strategy';
import { RedisService } from '../../cache/redis.service';
import { RegisterDto, LoginDto } from '../../../domain/dto/auth';
import {
  IAuthResponse,
  IRefreshTokenResponse,
} from '../../../domain/interfaces';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async register(registerDto: RegisterDto): Promise<IAuthResponse> {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      email: registerDto.email,
      password: hashedPassword,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      phone: registerDto.phone,
      role: UserRole.CUSTOMER,
      isActive: true,
      emailVerifiedAt: new Date(),
    });

    await this.userRepository.save(user);

    return this.generateTokens(user);
  }

  async login(loginDto: LoginDto): Promise<IAuthResponse> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    return this.generateTokens(user);
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<IRefreshTokenResponse> {
    try {
      const jwtSecret =
        this.configService.get<string>('JWT_SECRET') ||
        'your-super-secret-jwt-key-change-in-production';
      const refreshSecret =
        this.configService.get<string>('JWT_REFRESH_SECRET') || jwtSecret;
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });

      const isBlacklisted = await this.redisService.get<boolean>(
        `blacklist:${refreshToken}`,
      );
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const tokens = await this.generateTokens(user);
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async generateTokens(user: User): Promise<IAuthResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const jwtSecret =
      this.configService.get<string>('JWT_SECRET') ||
      'your-super-secret-jwt-key-change-in-production';
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') || jwtSecret;
    const accessTokenExpiration =
      this.configService.get<string>('JWT_EXPIRATION') || '1h';
    const refreshTokenExpiration =
      this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtSecret,
        expiresIn: accessTokenExpiration,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshTokenExpiration,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as string,
      },
    };
  }

  async logout(accessToken: string, refreshToken?: string): Promise<void> {
    try {
      const accessPayload = this.jwtService.decode(accessToken);
      const accessExp = accessPayload.exp
        ? accessPayload.exp * 1000
        : Date.now() + 3600000;
      const accessTtl = Math.floor((accessExp - Date.now()) / 1000);

      if (accessTtl > 0) {
        await this.redisService.set(
          `blacklist:${accessToken}`,
          true,
          accessTtl,
        );
      }

      if (refreshToken) {
        const refreshPayload = this.jwtService.decode(refreshToken);
        const refreshExp = refreshPayload.exp
          ? refreshPayload.exp * 1000
          : Date.now() + 604800000;
        const refreshTtl = Math.floor((refreshExp - Date.now()) / 1000);

        if (refreshTtl > 0) {
          await this.redisService.set(
            `blacklist:${refreshToken}`,
            true,
            refreshTtl,
          );
        }
      }
    } catch (error) {
      // Ignore errors during logout
    }
  }
}
