import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Pusher from 'pusher';

@Injectable()
export class SoketiService {
  private readonly logger = new Logger(SoketiService.name);
  private pusher: Pusher;

  constructor(private readonly configService: ConfigService) {
    const appId = this.configService.get<string>('PUSHER_APP_ID', 'ecom-app');
    const key = this.configService.get<string>('PUSHER_APP_KEY', 'ecom-key');
    const secret = this.configService.get<string>('PUSHER_APP_SECRET', 'ecom-secret');
    const host = this.configService.get<string>('PUSHER_HOST', 'soketi');
    const port = this.configService.get<number>('PUSHER_PORT', 6001);
    const scheme = this.configService.get<string>('PUSHER_SCHEME', 'http');

    // For Soketi, we can include port in host or use httpPath
    // Using host with port included works better with Soketi
    const hostWithPort = `${host}:${port}`;

    this.pusher = new Pusher({
      appId,
      key,
      secret,
      host: hostWithPort,
      useTLS: scheme === 'https',
      cluster: this.configService.get<string>('PUSHER_APP_CLUSTER', 'mt1'),
    });

    this.logger.log(`Soketi/Pusher service initialized (${scheme}://${host}:${port})`);
  }

  async broadcastNotification(channel: string, event: string, data: any): Promise<void> {
    try {
      await this.pusher.trigger(channel, event, data);
      this.logger.log(`Broadcasted to ${channel}:${event}`);
    } catch (error: any) {
      this.logger.error(`Failed to broadcast to ${channel}:${event}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async broadcastAdminNotification(notification: any): Promise<void> {
    await this.broadcastNotification('admin-notifications', 'new-notification', notification);
  }
}

