import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/persistence/database.module';
import { RedisModule } from './infrastructure/services/redis/redis.module';
import { UserController } from './application/controllers/user/user.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    RedisModule,
  ],
  controllers: [UserController],
  providers: [],
})
export class AppModule {}
