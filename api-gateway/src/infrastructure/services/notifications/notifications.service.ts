import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Notification } from '../../../domain/entities/notification.entity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { INotificationsListResponse } from '../../../domain/interfaces';
import { RedisService } from '../../cache/redis.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly webhookUrl: string;
  private readonly webhookApiKey: string;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.webhookUrl = this.configService.get<string>(
      'LARAVEL_WEBHOOK_URL',
      'http://admin-service:8000/api/webhook',
    );
    this.webhookApiKey = this.configService.get<string>(
      'TEST_WEB_HOOK_KEY',
      '',
    );
  }

  async findAllForAdmins(
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    } = {},
  ): Promise<INotificationsListResponse> {
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId IS NULL')
      .orderBy('notification.createdAt', 'DESC');

    if (options.unreadOnly) {
      query.andWhere('notification.readAt IS NULL');
    }

    if (options.limit) {
      query.limit(options.limit);
    }
    if (options.offset) {
      query.offset(options.offset);
    }

    const [data, total] = await query.getManyAndCount();

    const unreadCount = await this.notificationRepository.count({
      where: {
        userId: IsNull(),
        readAt: IsNull(),
      },
    });

    return { data, total, unreadCount };
  }

  async markAsRead(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.webhookUrl}/notifications/mark-as-read`,
          { id },
          {
            headers: {
              'X-API-Key': this.webhookApiKey,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to mark notification as read');
      }

      notification.readAt = response.data.notification.read_at
        ? new Date(response.data.notification.read_at)
        : new Date();

      const updated = await this.notificationRepository.save(notification);

      await this.publishDatabaseEvent('notifications', 'UPDATE', updated);

      return updated;
    } catch (error: any) {
      throw new NotFoundException(
        error.response?.data?.error || error.message || `Failed to mark notification as read`,
      );
    }
  }

  async markAllAsRead(): Promise<{ message: string; count: number }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.webhookUrl}/notifications/mark-all-read`,
          {},
          {
            headers: {
              'X-API-Key': this.webhookApiKey,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to mark all notifications as read');
      }

      const updatedNotifications = await this.notificationRepository.find({
        where: { userId: IsNull(), readAt: IsNull() },
      });

      await this.notificationRepository.update(
        { userId: IsNull(), readAt: IsNull() },
        { readAt: new Date() },
      );

      for (const notification of updatedNotifications) {
        notification.readAt = new Date();
        await this.publishDatabaseEvent('notifications', 'UPDATE', notification);
      }

      return {
        message: response.data.message,
        count: response.data.count,
      };
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || error.message || `Failed to mark all notifications as read`,
      );
    }
  }

  async getUnreadCount(): Promise<number> {
    return this.notificationRepository.count({
      where: {
        userId: IsNull(),
        readAt: IsNull(),
      },
    });
  }

  async syncNotification(notificationData: any): Promise<Notification> {
    const existing = await this.notificationRepository.findOne({
      where: { id: notificationData.id },
    });

    if (existing) {
      Object.assign(existing, {
        userId: notificationData.user_id,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data,
        readAt: notificationData.read_at
          ? new Date(notificationData.read_at)
          : null,
      });
      return this.notificationRepository.save(existing);
    }

    const notification = this.notificationRepository.create({
      id: notificationData.id,
      userId: notificationData.user_id,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      data: notificationData.data,
      readAt: notificationData.read_at
        ? new Date(notificationData.read_at)
        : null,
      createdAt: notificationData.created_at
        ? new Date(notificationData.created_at)
        : new Date(),
      updatedAt: notificationData.updated_at
        ? new Date(notificationData.updated_at)
        : new Date(),
    });

    return this.notificationRepository.save(notification);
  }

  private async publishDatabaseEvent(
    table: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    data: Notification,
  ): Promise<void> {
    try {
      const eventData = {
        table,
        operation,
        data: {
          id: data.id,
          user_id: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data,
          read_at: data.readAt,
          created_at: data.createdAt,
          updated_at: data.updatedAt,
        },
        id: data.id,
        timestamp: new Date().toISOString(),
      };

      const message = JSON.stringify(eventData);
      await this.redisService.publish('database:events', message);

      this.logger.log(
        `Published database event: ${operation} on ${table} (${data.id})`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to publish database event: ${error.message}`,
        error.stack,
      );
    }
  }
}
