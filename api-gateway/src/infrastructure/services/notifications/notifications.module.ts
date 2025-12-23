import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Notification } from '../../../domain/entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationEventsService } from './notification-events.service';
import { INotificationsService } from '../../../domain/interfaces/services';
import { RedisModule } from '../../cache/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), HttpModule, RedisModule],
  providers: [
    NotificationsService,
    {
      provide: 'INotificationsService',
      useClass: NotificationsService,
    },
    NotificationEventsService,
  ],
  exports: ['INotificationsService', NotificationsService, NotificationEventsService],
})
export class NotificationsModule {}
