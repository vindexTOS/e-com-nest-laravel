import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../domain/entities/user.entity';
import { UsersGateway } from './websockets/users.gateway';
import { JwtAuthGuard } from './libs/guards/jwt-auth.guard';
import { RolesGuard } from './libs/guards/roles.guard';
import { JwtWsGuard } from './libs/guards/jwt-ws.guard';
import { UsersModule } from './services/users/users.module';
import { OrdersModule } from './services/orders/orders.module';
import { NotificationsModule } from './services/notifications/notifications.module';
import { AuthModule } from './authentication/auth.module';
// 
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    UsersModule,
    OrdersModule,
    NotificationsModule,
    AuthModule,
  ],
  providers: [
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
  exports: [UsersGateway],
})
export class InfrastructureModule {}

