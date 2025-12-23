import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ElasticsearchService } from '../search/elasticsearch.service';

export interface DatabaseEvent {
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
  id: string;
  timestamp: string;
}

@Injectable()
export class DatabaseEventSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseEventSubscriber.name);
  private readonly EVENT_CHANNEL = 'database:events';
  private subscriber: Redis;

  private readonly PRODUCTS_CACHE_VERSION_KEY = 'products:cache:version';
  private readonly PRODUCTS_CACHE_VERSION_TTL = 60 * 60 * 24 * 365 * 10;

  constructor(
    @InjectDataSource('read') private readonly readDataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  async onModuleInit() {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    await this.subscribeToEvents();
    this.logger.log('Database event subscriber initialized');
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.unsubscribe(this.EVENT_CHANNEL);
      await this.subscriber.quit();
    }
  }

  private async subscribeToEvents(): Promise<void> {
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

    this.subscriber.subscribe(this.EVENT_CHANNEL, (err, count) => {
      if (err) {
        this.logger.error(`Failed to subscribe to ${this.EVENT_CHANNEL}:`, err);
      } else {
        this.logger.log(
          `Subscribed to ${this.EVENT_CHANNEL} channel (${count} channels)`,
        );
      }
    });

    this.subscriber.on('message', async (channel, message) => {
      if (channel === this.EVENT_CHANNEL) {
        this.logger.log(
          `Received message on ${this.EVENT_CHANNEL}: ${message.substring(0, 100)}...`,
        );
        await this.handleEvent(message);
      }
    });

    this.subscriber.on('error', (error) => {
      this.logger.error('Redis subscriber error:', error);
    });
  }

  private async handleEvent(message: string): Promise<void> {
    try {
      const event: DatabaseEvent = JSON.parse(message);
      this.logger.log(
        `Received event: ${event.operation} on ${event.table} (${event.id})`,
      );

      if (event.table === 'orders' && event.operation === 'INSERT') {
        await this.handleInsertWithRetry(event, 20, 1000);
        return;
      }

      if (event.table === 'order_items' && event.operation === 'INSERT') {
        await this.handleInsertWithRetry(event, 20, 1000);
        return;
      }

      const queryRunner = this.readDataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        switch (event.operation) {
          case 'INSERT':
            await this.handleInsert(queryRunner, event);
            break;
          case 'UPDATE':
            await this.handleUpdate(queryRunner, event);
            break;
          case 'DELETE':
            await this.handleDelete(queryRunner, event);
            break;
        }

        await queryRunner.commitTransaction();
        this.logger.log(
          `Successfully processed ${event.operation} on ${event.table} (${event.id})`,
        );
      } catch (error: any) {
        await queryRunner.rollbackTransaction();
        this.logger.error(
          `Failed to process ${event.operation} on ${event.table} (${event.id}): ${error.message}`,
          error.stack,
        );
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to parse or handle event: ${error.message}`,
        error.stack,
      );
      this.logger.error(`Raw message: ${message}`);
    }
  }

  private async handleInsertWithRetry(
    event: DatabaseEvent,
    retries = 10,
    delay = 500,
  ): Promise<void> {
    for (let i = 0; i < retries; i++) {
      const queryRunner = this.readDataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        await this.handleInsert(queryRunner, event);
        await queryRunner.commitTransaction();
        this.logger.log(
          `Successfully processed ${event.operation} on ${event.table} (${event.id})`,
        );
        await queryRunner.release();
        return;
      } catch (error: any) {
        await queryRunner.rollbackTransaction();
        await queryRunner.release();

        const isForeignKeyError = error.message.includes(
          'foreign key constraint',
        );
        const isLastRetry = i === retries - 1;

        if (isForeignKeyError && !isLastRetry) {
          this.logger.warn(
            `${event.table} insert failed (foreign key), retrying in ${delay}ms... (${i + 1}/${retries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (isLastRetry) {
          this.logger.error(
            `Failed to process ${event.operation} on ${event.table} (${event.id}) after ${retries} retries: ${error.message}`,
          );
        } else {
          this.logger.error(
            `Failed to process ${event.operation} on ${event.table} (${event.id}): ${error.message}`,
          );
        }
        throw error;
      }
    }
  }

  private async handleInsert(
    queryRunner: any,
    event: DatabaseEvent,
  ): Promise<void> {
    const { table, data } = event;

    const cleanData = this.filterRelationData(data);

    if (table === 'users' && !cleanData.password) {
      this.logger.warn(
        `User insert missing password, skipping sync for security`,
      );
      return;
    }

    if (Object.keys(cleanData).length === 0) {
      this.logger.warn(`No valid data to insert for table ${table}`);
      return;
    }

    const columns = Object.keys(cleanData);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const values = columns.map((col) => this.convertValue(cleanData[col]));
    const columnNames = columns.map((col) => `"${col}"`).join(', ');

    const updateColumns = columns.filter(
      (c) => c !== 'id' && c !== 'created_at',
    );
    const updateClause =
      updateColumns.length > 0
        ? updateColumns.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ')
        : '"updated_at" = EXCLUDED."updated_at"';

    await queryRunner.query(
      `INSERT INTO "${table}" (${columnNames}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updateClause}`,
      values,
    );
  }

  private async handleUpdate(
    queryRunner: any,
    event: DatabaseEvent,
  ): Promise<void> {
    const { table, data, id } = event;

    const cleanData = this.filterRelationData(data);
    
    if (table === 'notifications') {
      this.logger.log(`Processing notification UPDATE: ${JSON.stringify(cleanData)}`);
    }
    
    const updateFields = Object.entries(cleanData)
      .filter(
        ([key]) => key !== 'id' && key !== 'created_at' && key !== 'updated_at',
      )
      .map(([key], index) => `"${key}" = $${index + 1}`);

    if (updateFields.length === 0) {
      this.logger.warn(`No fields to update for table ${table}, id ${id}. Clean data: ${JSON.stringify(cleanData)}`);
      return;
    }

    const values = Object.entries(cleanData)
      .filter(
        ([key]) => key !== 'id' && key !== 'created_at' && key !== 'updated_at',
      )
      .map(([, value]) => this.convertValue(value));

    values.push(id);

    const setClause = updateFields.join(', ');

    if (table === 'notifications') {
      this.logger.log(`Updating notification ${id} with fields: ${setClause}`);
    }

    await queryRunner.query(
      `UPDATE "${table}" SET ${setClause}, "updated_at" = NOW() WHERE "id" = $${values.length}`,
      values,
    );
  }

  private async handleDelete(
    queryRunner: any,
    event: DatabaseEvent,
  ): Promise<void> {
    const { table, id } = event;

    const hasDeletedAt = await this.hasColumn(queryRunner, table, 'deleted_at');

    if (hasDeletedAt) {
      await queryRunner.query(
        `UPDATE "${table}" SET "deleted_at" = NOW(), "updated_at" = NOW() WHERE "id" = $1 AND "deleted_at" IS NULL`,
        [id],
      );
    } else {
      await queryRunner.query(`DELETE FROM "${table}" WHERE "id" = $1`, [id]);
    }
  }

  private filterRelationData(data: any): Record<string, any> {
    const cleanData: Record<string, any> = {};
    const relationKeys = [
      'category',
      'user',
      'items',
      'parent',
      'children',
      'products',
      'order',
      'product',
    ];

    for (const [key, value] of Object.entries(data)) {
      if (relationKeys.includes(key)) {
        continue;
      }

      if (key === 'id' || key === 'created_at' || key === 'deleted_at') {
        cleanData[key] = value;
        continue;
      }

      if (key === 'updated_at') {
        continue;
      }

      if (value === null) {
        cleanData[key] = null;
        continue;
      }

      if (Array.isArray(value)) {
        continue;
      }

      if (typeof value === 'object' && value !== null) {
        if (value instanceof Date) {
          cleanData[key] = value;
        } else if (value.constructor === Object) {
          continue;
        } else {
          continue;
        }
      } else {
        cleanData[key] = value;
      }
    }

    return cleanData;
  }

  private convertValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (
      typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
    ) {
      return value;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      return value;
    }

    return String(value);
  }

  private async hasColumn(
    queryRunner: any,
    table: string,
    column: string,
  ): Promise<boolean> {
    try {
      const result = await queryRunner.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [table, column],
      );
      return result.length > 0;
    } catch {
      return false;
    }
  }
}
