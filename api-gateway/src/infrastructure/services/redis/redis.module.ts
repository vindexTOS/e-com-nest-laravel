import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'REDIS_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.REDIS,
          options: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [RedisService],
  exports: [RedisService, ClientsModule],
})
export class RedisModule {}

