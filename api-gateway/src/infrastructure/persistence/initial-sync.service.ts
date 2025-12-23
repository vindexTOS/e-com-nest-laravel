import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ElasticsearchService } from '../search/elasticsearch.service';

@Injectable()
export class InitialSyncService implements OnModuleInit {
  private readonly logger = new Logger(InitialSyncService.name);

  constructor(
    @InjectDataSource('write') private readonly writeDataSource: DataSource,
    @InjectDataSource('read') private readonly readDataSource: DataSource,
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  async onModuleInit() {
    this.logger.log('InitialSyncService initialized, starting sync...');
    await this.syncAllData();
  }

  private async syncAllData(): Promise<void> {
    try {
      this.logger.log(
        'Starting initial data sync from write to read database...',
      );

      await new Promise((resolve) => setTimeout(resolve, 2000));

      await this.syncTable('users');
      await this.syncTable('categories');
      await this.syncTable('products');
      await this.syncTable('orders');
      await this.syncTable('order_items');
      await this.syncTable('notifications');

      await this.syncProductsToElasticsearch();
      await this.invalidateProductCache();

      this.logger.log('Initial data sync completed successfully');
    } catch (error: any) {
      this.logger.error(`Initial sync failed: ${error.message}`, error.stack);
    }
  }

  private async syncTable(tableName: string): Promise<void> {
    try {
      const writeQueryRunner = this.writeDataSource.createQueryRunner();
      await writeQueryRunner.connect();

      const readQueryRunner = this.readDataSource.createQueryRunner();
      await readQueryRunner.connect();
      await readQueryRunner.startTransaction();

      try {
        const columns = await this.getTableColumns(writeQueryRunner, tableName);
        if (columns.length === 0) {
          this.logger.warn(`Table ${tableName} has no columns, skipping`);
          await readQueryRunner.release();
          await writeQueryRunner.release();
          return;
        }

        const hasDeletedAt = columns.includes('deleted_at');
        const whereClause = hasDeletedAt ? 'WHERE deleted_at IS NULL' : '';

        let query = `SELECT * FROM "${tableName}" ${whereClause}`;
        if (tableName === 'orders' || tableName === 'order_items') {
          query += ' ORDER BY created_at ASC';
        } else {
          query += ' ORDER BY created_at ASC';
        }

        const rows = await writeQueryRunner.query(query);

        if (rows.length === 0) {
          this.logger.log(`No data to sync for table ${tableName}`);
          await readQueryRunner.commitTransaction();
          await readQueryRunner.release();
          await writeQueryRunner.release();
          return;
        }

        let synced = 0;
        for (const row of rows) {
          const cleanData = this.filterRelationData(row);

          if (tableName === 'users' && !cleanData.password) {
            this.logger.warn(
              `Skipping user ${cleanData.id} - missing password`,
            );
            continue;
          }

          if (Object.keys(cleanData).length === 0) {
            continue;
          }

          const insertColumns = Object.keys(cleanData);
          const placeholders = insertColumns
            .map((_, i) => `$${i + 1}`)
            .join(', ');
          const values = insertColumns.map((col) =>
            this.convertValue(cleanData[col]),
          );
          const columnNames = insertColumns.map((col) => `"${col}"`).join(', ');

          const updateColumns = insertColumns.filter(
            (c) => c !== 'id' && c !== 'created_at',
          );
          const updateClause =
            updateColumns.length > 0
              ? updateColumns.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ')
              : '"updated_at" = EXCLUDED."updated_at"';

          await readQueryRunner.query(
            `INSERT INTO "${tableName}" (${columnNames}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updateClause}`,
            values,
          );
          synced++;
        }

        await readQueryRunner.commitTransaction();
        this.logger.log(`Synced ${synced} records from ${tableName}`);
      } catch (error: any) {
        await readQueryRunner.rollbackTransaction();
        this.logger.error(
          `Failed to sync table ${tableName}: ${error.message}`,
          error.stack,
        );
        throw error;
      } finally {
        await readQueryRunner.release();
        await writeQueryRunner.release();
      }
    } catch (error: any) {
      this.logger.error(
        `Error syncing table ${tableName}: ${error.message}`,
        error.stack,
      );
    }
  }

  private async getTableColumns(
    queryRunner: any,
    tableName: string,
  ): Promise<string[]> {
    const result = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
      [tableName],
    );
    return result.map((row: any) => row.column_name);
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
      if (key.endsWith('_id')) {
        cleanData[key] = value;
        continue;
      }

      if (relationKeys.includes(key)) {
        continue;
      }

      if (
        key === 'id' ||
        key === 'created_at' ||
        key === 'updated_at' ||
        key === 'deleted_at'
      ) {
        cleanData[key] = value;
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

  private async syncProductsToElasticsearch(): Promise<void> {
    try {
      this.logger.log('Syncing products to Elasticsearch...');
      const readQueryRunner = this.readDataSource.createQueryRunner();
      await readQueryRunner.connect();

      const products = await readQueryRunner.query(
        `SELECT * FROM "products" WHERE deleted_at IS NULL ORDER BY created_at ASC`,
      );

      for (const product of products) {
        try {
          const productData = {
            id: product.id,
            name: product.name,
            slug: product.slug,
            description: product.description,
            sku: product.sku,
            price: product.price,
            compare_at_price: product.compare_at_price,
            cost_price: product.cost_price,
            stock: product.stock,
            low_stock_threshold: product.low_stock_threshold,
            weight: product.weight,
            status: product.status,
            is_featured: product.is_featured,
            meta_title: product.meta_title,
            meta_description: product.meta_description,
            category_id: product.category_id,
            image: product.image,
            created_at: product.created_at,
            updated_at: product.updated_at,
          };
          await this.elasticsearchService.indexProduct(productData);
        } catch (error: any) {
          this.logger.error(
            `Failed to sync product ${product.id} to Elasticsearch: ${error.message}`,
          );
        }
      }

      await readQueryRunner.release();
      this.logger.log(`Synced ${products.length} products to Elasticsearch`);
    } catch (error: any) {
      this.logger.error(
        `Failed to sync products to Elasticsearch: ${error.message}`,
        error.stack,
      );
    }
  }

  private async invalidateProductCache(): Promise<void> {
    try {
      const Redis = require('ioredis');
      const redisHost = process.env.REDIS_HOST || 'redis';
      const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
      const cacheClient = new Redis({
        host: redisHost,
        port: redisPort,
      });
      await cacheClient.setex(
        'products:cache:version',
        60 * 60 * 24 * 365 * 10,
        Date.now().toString(),
      );
      await cacheClient.quit();
      this.logger.log('Product cache invalidated');
    } catch (error: any) {
      this.logger.error(`Failed to invalidate product cache: ${error.message}`);
    }
  }
}
