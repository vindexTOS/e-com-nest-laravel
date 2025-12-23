import {
  Injectable,
  Inject,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: RedisClientType;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.redisClient = createClient({
      socket: {
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
      },
    });

    this.redisClient.on('error', (err) => {
      this.logger.error('Redis Client Error:', err);
    });

    await this.redisClient.connect();
    this.logger.log('Redis client connected for pub/sub operations');
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  getClient(): RedisClientType {
    return this.redisClient;
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      this.logger.error(`Error getting key ${key}:`, error);
      return undefined;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      this.logger.error(`Error setting key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.error(`Error deleting key ${key}:`, error);
    }
  }

  async reset(): Promise<void> {
    try {
      await this.cacheManager.reset();
    } catch (error) {
      this.logger.error('Error resetting cache:', error);
    }
  }

  async publish(channel: string, message: string): Promise<number> {
    try {
      return await this.redisClient.publish(channel, message);
    } catch (error) {
      this.logger.error(`Error publishing to channel ${channel}:`, error);
      throw error;
    }
  }

  async subscribe(
    channel: string,
    callback: (message: string) => void,
  ): Promise<void> {
    try {
      await this.redisClient.subscribe(channel, (message) => {
        callback(message);
      });
    } catch (error) {
      this.logger.error(`Error subscribing to channel ${channel}:`, error);
      throw error;
    }
  }

  async lpush(key: string, value: string): Promise<number> {
    try {
      return await this.redisClient.lPush(key, value);
    } catch (error) {
      this.logger.error(`Error pushing to list ${key}:`, error);
      throw error;
    }
  }

  async rpop(key: string): Promise<string | null> {
    try {
      return await this.redisClient.rPop(key);
    } catch (error) {
      this.logger.error(`Error popping from list ${key}:`, error);
      return null;
    }
  }
}
