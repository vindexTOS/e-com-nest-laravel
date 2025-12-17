import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);

  constructor(
    @Inject('REDIS_SERVICE')
    private readonly client: ClientProxy,
  ) {}

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('Connected to Redis microservice');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
    }
  }

  async publish(channel: string, data: any) {
    return this.client.emit(channel, data);
  }

  async send(pattern: string, data: any) {
    return this.client.send(pattern, data).toPromise();
  }
}

