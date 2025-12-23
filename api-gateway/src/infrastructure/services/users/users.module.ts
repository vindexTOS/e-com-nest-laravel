import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../../domain/entities/user.entity';
import { UsersService } from './users.service';
import { IUsersService } from '../../../domain/interfaces/services';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [
    UsersService,
    {
      provide: 'IUsersService',
      useClass: UsersService,
    },
  ],
  exports: ['IUsersService', UsersService],
})
export class UsersModule {}

