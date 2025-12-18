import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './infrastructure/persistence/database.module';
import { RedisModule } from './infrastructure/cache/redis.module';
import { UserController } from './application/controllers/user/user.controller';
import { AdminSeeder } from './infrastructure/persistence/seeders/admin.seeder';
import { AuthModule } from './infrastructure/authentication/auth.module';
import { JwtAuthGuard } from './infrastructure/libs/guards/jwt-auth.guard';
import { RolesGuard } from './infrastructure/libs/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    RedisModule,
    AuthModule,
  ],
  controllers: [UserController],
  providers: [
    AdminSeeder,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
