import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { ElasticsearchService } from '../../search/elasticsearch.service';
import { RedisService } from '../../cache/redis.service';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Product,
  ProductStatus,
} from '../../../domain/entities/product.entity';
import { CreateProductDto } from '../../../domain/dto/product/create-product.dto';
import { UpdateProductDto } from '../../../domain/dto/product/update-product.dto';

export interface SearchResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);
  private readonly CACHE_TTL = 3600;
  private readonly PRODUCTS_CACHE_VERSION_KEY = 'products:cache:version';
  private readonly PRODUCTS_CACHE_VERSION_TTL = 60 * 60 * 24 * 365 * 10;

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly redisService: RedisService,
    @InjectRepository(Product, 'read')
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Product, 'write')
    private readonly writeProductRepository: Repository<Product>,
    @InjectDataSource('read')
    private readonly readDataSource: DataSource,
    @InjectDataSource('write')
    private readonly writeDataSource: DataSource,
  ) {}

  private async getProductsCacheVersion(): Promise<string> {
    const existing = await this.redisService.get<string>(
      this.PRODUCTS_CACHE_VERSION_KEY,
    );
    if (existing) return existing;

    // Initialize lazily so first request doesn't fail on missing key
    const initial = Date.now().toString();
    await this.redisService.set(
      this.PRODUCTS_CACHE_VERSION_KEY,
      initial,
      this.PRODUCTS_CACHE_VERSION_TTL,
    );
    return initial;
  }

  async onModuleInit() {
    this.logger.log(
      'ProductsService initialized, scheduling Elasticsearch sync...',
    );
    // Delay sync to allow database and ES to be fully ready
    setTimeout(async () => {
      try {
        await this.checkAndSync();
      } catch (error) {
        this.logger.error('Failed to perform initial sync:', error);
        // Retry after another delay
        setTimeout(async () => {
          try {
            await this.checkAndSync();
          } catch (retryError) {
            this.logger.error('Failed to perform retry sync:', retryError);
          }
        }, 10000);
      }
    }, 5000);
  }

  private isDatabaseReady(): boolean {
    return !!this.productRepository;
  }

  private async checkAndSync() {
    try {
      if (!this.isDatabaseReady()) {
        this.logger.warn('Database not ready for sync, will retry later...');
        return;
      }

      this.logger.log('Performing initial Elasticsearch sync check...');
      const result = await this.elasticsearchService.searchProductsWithFilters({
        page: 1,
        limit: 1,
      });

      const total =
        typeof result.total === 'object' ? result.total.value : result.total;

      if (total === 0) {
        this.logger.log(
          'Elasticsearch index is empty. Triggering automatic sync...',
        );
        await this.syncToElasticsearch();
      } else {
        this.logger.log(
          `Elasticsearch already has ${total} products. Skipping initial sync.`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to perform initial sync check:', error);
    }
  }

  async syncToElasticsearch(): Promise<{
    message: string;
    productsCount: number;
  }> {
    this.logger.log('Starting full sync to Elasticsearch...');

    const products = await this.readDataSource.query(
      `SELECT * FROM products WHERE deleted_at IS NULL ORDER BY updated_at DESC`,
    );

    this.logger.log(
      `Found ${products.length} products in read database, syncing to Elasticsearch...`,
    );

    let synced = 0;
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
        synced++;
      } catch (error: any) {
        this.logger.error(
          `Failed to sync product ${product.id} to Elasticsearch: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Synced ${synced}/${products.length} products to Elasticsearch`,
    );

    return {
      message: `Synced ${synced} products to Elasticsearch.`,
      productsCount: synced,
    };
  }

  async syncFromWriteDatabase(): Promise<{
    message: string;
    productsCount: number;
  }> {
    this.logger.log('Starting full sync from write database...');

    const writeQueryRunner = this.writeDataSource.createQueryRunner();
    await writeQueryRunner.connect();

    try {
      const products = await writeQueryRunner.query(
        `SELECT * FROM products WHERE deleted_at IS NULL ORDER BY created_at`,
      );

      this.logger.log(
        `Found ${products.length} products in write database, syncing to read database and Elasticsearch...`,
      );

      const readQueryRunner = this.readDataSource.createQueryRunner();
      await readQueryRunner.connect();

      try {
        let syncedCount = 0;
        for (const product of products) {
          const cleanData: Record<string, any> = {};
          for (const [key, value] of Object.entries(product)) {
            if (
              key === 'category' ||
              (typeof value === 'object' &&
                value !== null &&
                !(value instanceof Date))
            ) {
              continue;
            }
            cleanData[key] = value;
          }

          const columns = Object.keys(cleanData);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          const values = columns.map((col) =>
            this.convertProductValue(cleanData[col]),
          );
          const columnNames = columns.map((col) => `"${col}"`).join(', ');

          const updateColumns = columns.filter(
            (c) => c !== 'id' && c !== 'created_at',
          );
          const updateClause =
            updateColumns.length > 0
              ? updateColumns.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ')
              : '"updated_at" = EXCLUDED."updated_at"';

          await readQueryRunner.query(
            `INSERT INTO "products" (${columnNames}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updateClause}`,
            values,
          );

          await this.elasticsearchService.indexProduct(cleanData);
          syncedCount++;
        }

        await this.invalidateProductCache();
        this.logger.log(
          `Synced ${syncedCount} products from write database to read database and Elasticsearch.`,
        );

        return {
          message: 'Sync from write database completed successfully',
          productsCount: syncedCount,
        };
      } finally {
        await readQueryRunner.release();
      }
    } finally {
      await writeQueryRunner.release();
    }
  }

  private convertProductValue(value: any): any {
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
    return value;
  }

  async syncProductToElasticsearch(productData: any): Promise<void> {
    this.logger.log(
      `Syncing individual product to Elasticsearch: ${productData.id}`,
    );

    // Convert the product data to the format expected by Elasticsearch
    const product = {
      id: productData.id,
      name: productData.name,
      slug: productData.slug,
      description: productData.description,
      sku: productData.sku,
      price: productData.price,
      compareAtPrice: productData.compare_at_price,
      costPrice: productData.cost_price,
      stock: productData.stock,
      lowStockThreshold: productData.low_stock_threshold,
      weight: productData.weight,
      status: productData.status,
      isFeatured: productData.is_featured,
      metaTitle: productData.meta_title,
      metaDescription: productData.meta_description,
      categoryId: productData.category_id,
      image: productData.image,
      createdAt: productData.created_at,
      updatedAt: productData.updated_at,
      category: productData.category,
    };

    await this.elasticsearchService.indexProduct(product);
    this.logger.log(`Product ${productData.id} synced to Elasticsearch`);
  }

  async getProducts(params: {
    search?: string;
    categoryId?: string;
    status?: string;
    page: number;
    limit: number;
    withDeleted?: boolean;
  }): Promise<SearchResult<any>> {
    const { search, categoryId, status, page, limit, withDeleted } = params;

    if (withDeleted) {
      return this.getDeletedProducts({ search, categoryId, page, limit });
    }

    await this.syncToElasticsearch();

    const [dbProducts, dbTotal] = await this.productRepository.findAndCount({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      relations: ['category'],
      take: limit,
      skip: (page - 1) * limit,
      order: { updatedAt: 'DESC' },
    });

    const searchResult: SearchResult<any> = {
      data: dbProducts,
      total: dbTotal,
      page,
      limit,
      totalPages: Math.ceil(dbTotal / limit),
    };

    return searchResult;
  }

  async getDeletedProducts(params: {
    search?: string;
    categoryId?: string;
    page: number;
    limit: number;
  }): Promise<SearchResult<any>> {
    const { search, categoryId, page, limit } = params;

    const query = this.productRepository
      .createQueryBuilder('product')
      .withDeleted()
      .leftJoinAndSelect('product.category', 'category')
      .where('product.deletedAt IS NOT NULL');

    if (search) {
      query.andWhere(
        '(product.name ILIKE :search OR product.sku ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (categoryId) {
      query.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    query.orderBy('product.deletedAt', 'DESC');

    const total = await query.getCount();
    const data = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProductById(id: string): Promise<any> {
    const v = await this.getProductsCacheVersion();
    const cacheKey = `products:v${v}:detail:${id}`;

    const cached = await this.redisService.get<any>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for product detail: ${cacheKey}`);
      return cached;
    }

    const product = await this.elasticsearchService.getProductById(id);
    if (product) {
      await this.redisService.set(cacheKey, product, this.CACHE_TTL);
    }
    return product;
  }

  async searchProducts(
    query: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<SearchResult<any>> {
    const v = await this.getProductsCacheVersion();
    const cacheKey = `products:v${v}:search:${query}:${page}:${limit}`;

    const cached = await this.redisService.get<SearchResult<any>>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for products search: ${cacheKey}`);
      return cached;
    }

    const result = await this.elasticsearchService.searchProducts(
      query,
      page,
      limit,
    );

    const searchResult: SearchResult<any> = {
      data: result.hits,
      total:
        typeof result.total === 'object' ? result.total.value : result.total,
      page,
      limit,
      totalPages: Math.ceil(
        (typeof result.total === 'object' ? result.total.value : result.total) /
          limit,
      ),
    };

    await this.redisService.set(cacheKey, searchResult, this.CACHE_TTL);

    return searchResult;
  }

  async searchCategories(
    query: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<SearchResult<any>> {
    const cacheKey = `search:categories:${query}:${page}:${limit}`;

    const cached = await this.redisService.get<SearchResult<any>>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for categories search: ${cacheKey}`);
      return cached;
    }

    const result = await this.elasticsearchService.searchCategories(
      query,
      page,
      limit,
    );

    const searchResult: SearchResult<any> = {
      data: result.hits,
      total:
        typeof result.total === 'object' ? result.total.value : result.total,
      page,
      limit,
      totalPages: Math.ceil(
        (typeof result.total === 'object' ? result.total.value : result.total) /
          limit,
      ),
    };

    await this.redisService.set(cacheKey, searchResult, this.CACHE_TTL);

    return searchResult;
  }

  async invalidateProductCache(): Promise<void> {
    this.logger.debug(
      'Product cache invalidation requested (bumping products cache version)',
    );
    const next = Date.now().toString();
    await this.redisService.set(
      this.PRODUCTS_CACHE_VERSION_KEY,
      next,
      this.PRODUCTS_CACHE_VERSION_TTL,
    );
  }

  async deleteProductFromElasticsearch(id: string): Promise<void> {
    await this.elasticsearchService.deleteProduct(id);
  }

  async createProduct(createProductDto: CreateProductDto): Promise<Product> {
    // Generate slug if not provided
    const slug =
      createProductDto.slug || this.generateSlug(createProductDto.name);

    // Write to WRITE database
    const product = this.writeProductRepository.create({
      ...createProductDto,
      slug,
      stock: createProductDto.stock ?? 0,
      status: createProductDto.status || ProductStatus.DRAFT,
      lowStockThreshold: createProductDto.lowStockThreshold ?? 10,
      isFeatured: createProductDto.isFeatured ?? false,
    });

    const saved = await this.writeProductRepository.save(product);

    // Reload with relations to ensure we have fresh data
    const freshProduct = await this.writeProductRepository.findOne({
      where: { id: saved.id },
      relations: ['category'],
    });

    if (!freshProduct) {
      throw new NotFoundException(`Product not found after creation`);
    }

    // Publish event to Redis for sync (NestJS to NestJS)
    await this.publishProductEvent('INSERT', freshProduct);

    // Sync to Elasticsearch
    await this.syncProductToElasticsearch(freshProduct);
    await this.invalidateProductCache();

    return freshProduct;
  }

  async updateProduct(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    // Check in write database
    const product = await this.writeProductRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Generate slug if name changed and slug not provided
    if (updateProductDto.name && !updateProductDto.slug) {
      updateProductDto.slug = this.generateSlug(updateProductDto.name);
    }

    Object.assign(product, updateProductDto);
    // Write to WRITE database
    const saved = await this.writeProductRepository.save(product);

    // Reload with relations to ensure we have fresh data
    const freshProduct = await this.writeProductRepository.findOne({
      where: { id: saved.id },
      relations: ['category'],
    });

    if (!freshProduct) {
      throw new NotFoundException(`Product with ID ${id} not found after save`);
    }

    // Publish event to Redis for sync (NestJS to NestJS)
    await this.publishProductEvent('UPDATE', freshProduct);

    // Sync to Elasticsearch
    await this.syncProductToElasticsearch(freshProduct);
    await this.invalidateProductCache();

    return freshProduct;
  }

  private async publishProductEvent(
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    product: Product | { id: string },
  ): Promise<void> {
    try {
      const serializedData =
        product instanceof Product ? this.serializeProduct(product) : product;
      const eventData = {
        table: 'products',
        operation,
        data: serializedData,
        id: product instanceof Product ? product.id : product.id,
        timestamp: new Date().toISOString(),
      };

      const message = JSON.stringify(eventData);
      const subscribers = await this.redisService.publish(
        'database:events',
        message,
      );

      this.logger.log(
        `Published product event: ${operation} for product ${eventData.id} (subscribers: ${subscribers})`,
      );
      this.logger.debug(`Event data: ${message.substring(0, 200)}...`);

      if (subscribers === 0) {
        this.logger.warn(
          `No subscribers for product event ${operation} on product ${eventData.id}`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to publish product event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private serializeProduct(product: Product): any {
    // Convert to snake_case to match database column names
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      sku: product.sku,
      price: product.price,
      compare_at_price: product.compareAtPrice,
      cost_price: product.costPrice,
      stock: product.stock,
      low_stock_threshold: product.lowStockThreshold,
      weight: product.weight,
      status: product.status,
      is_featured: product.isFeatured,
      meta_title: product.metaTitle,
      meta_description: product.metaDescription,
      category_id: product.categoryId,
      image: product.image,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
