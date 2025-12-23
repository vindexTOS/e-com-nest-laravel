import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Notification } from '../../../domain/entities/notification.entity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { INotificationsListResponse } from '../../../domain/interfaces';

@Injectable()
export class NotificationsService {
  private readonly laravelGraphQLUrl: string;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.laravelGraphQLUrl = this.configService.get<string>(
      'LARAVEL_GRAPHQL_URL',
      'http://admin-service:8000/graphql',
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
      .where('notification.userId IS NULL') // For all admins
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

    // Get unread count
    const unreadCount = await this.notificationRepository.count({
      where: {
        userId: IsNull(),
        readAt: IsNull(),
      },
    });

    return { data, total, unreadCount };
  }

  async markAsRead(id: string): Promise<Notification> {
    // Check if notification exists in read DB
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    // Call Laravel GraphQL API to mark as read (updates write DB)
    const mutation = `
      mutation {
        markNotificationAsRead(id: "${id}") {
          id
          read_at
          updated_at
        }
      }
    `;

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.laravelGraphQLUrl, {
          query: mutation,
        }),
      );

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      // Wait a bit for replication to sync, then refresh from read DB
      await new Promise((resolve) => setTimeout(resolve, 500));

      return (
        (await this.notificationRepository.findOne({
          where: { id },
        })) || notification
      );
    } catch (error) {
      console.error(
        `Failed to mark notification as read via Laravel: ${error}`,
      );
      throw new NotFoundException(`Failed to mark notification as read`);
    }
  }

  async markAllAsRead(): Promise<{ message: string; count: number }> {
    // Call Laravel GraphQL API to mark all as read (updates write DB)
    const mutation = `
      mutation {
        markAllNotificationsAsRead {
          message
          count
        }
      }
    `;

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.laravelGraphQLUrl, {
          query: mutation,
        }),
      );

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      const result = response.data.data.markAllNotificationsAsRead;

      // Wait a bit for replication to sync
      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        message: result.message,
        count: result.count,
      };
    } catch (error) {
      console.error(
        `Failed to mark all notifications as read via Laravel: ${error}`,
      );
      throw new Error(`Failed to mark all notifications as read`);
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
}
