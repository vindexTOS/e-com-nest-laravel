import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../../domain/entities/user.entity';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from '../services/auth/auth.service';
import { IAuthService } from '../../domain/interfaces/services';
import { RedisModule } from '../cache/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>(
          'JWT_SECRET',
          'your-super-secret-jwt-key-change-in-production',
        ),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '1h'),
        },
      }),
      inject: [ConfigService],
    }),
    RedisModule,
  ],
  providers: [
    AuthService,
    {
      provide: 'IAuthService',
      useClass: AuthService,
    },
    JwtStrategy,
  ],
  exports: ['IAuthService', AuthService, JwtModule, PassportModule, JwtStrategy],
})
export class AuthModule {}
