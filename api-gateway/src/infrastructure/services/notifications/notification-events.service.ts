import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationEventsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationEventsService.name);
  private subscriber: Redis;
  private broadcastCallback: ((notification: any) => void) | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  setBroadcastCallback(callback: (notification: any) => void) {
    this.broadcastCallback = callback;
  }

  async onModuleInit() {
    await this.subscribeToNotificationEvents();
  }

  private async subscribeToNotificationEvents(): Promise<void> {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'redis');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

    this.subscriber = new Redis({
      host: redisHost,
      port: redisPort,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.subscriber.subscribe('notification-events', (err, count) => {
      if (err) {
        this.logger.error('Failed to subscribe to notification-events:', err);
      } else {
        this.logger.log(`Subscribed to notification-events channel (${count} channels)`);
      }
    });

    this.subscriber.on('message', async (channel, message) => {
      if (channel === 'notification-events') {
        try {
          const event = JSON.parse(message);
          await this.handleNotificationEvent(event);
        } catch (error) {
          this.logger.error('Failed to process notification event:', error);
        }
      }
    });

    this.subscriber.on('error', (error) => {
      this.logger.error('Redis subscriber error:', error);
    });
  }

  private async handleNotificationEvent(event: { event: string; data: any; timestamp: string }): Promise<void> {
    this.logger.log(`Received notification event: ${event.event}`);

    if (event.event === 'notification.created') {
      // Sync the notification to the read database
      try {
        const notification = await this.notificationsService.syncNotification(event.data);
        this.logger.log(`Notification synced: ${notification.id}`);

        // Broadcast to WebSocket clients
        if (this.broadcastCallback) {
          this.broadcastCallback(notification);
        }
      } catch (error) {
        this.logger.error('Failed to sync notification:', error);
      }
    }
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.unsubscribe('notification-events');
      await this.subscriber.quit();
    }
  }
}

