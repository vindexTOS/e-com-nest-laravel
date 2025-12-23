import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../domain/entities/user.entity';
import { UsersService } from './services/users/users.service';
import { UsersGateway } from './websockets/users.gateway';
import { JwtAuthGuard } from './libs/guards/jwt-auth.guard';
import { RolesGuard } from './libs/guards/roles.guard';
import { JwtWsGuard } from './libs/guards/jwt-ws.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [
    UsersService,
    UsersGateway,
    JwtWsGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [UsersService, UsersGateway],
})
export class InfrastructureModule {}

