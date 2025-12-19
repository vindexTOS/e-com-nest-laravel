import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '../../search/elasticsearch.service';
import { RedisService } from '../../cache/redis.service';

export interface SearchResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  private readonly CACHE_TTL = 3600;

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly redisService: RedisService,
  ) {}

  async searchProducts(
    query: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<SearchResult<any>> {
    const cacheKey = `search:products:${query}:${page}:${limit}`;

    const cached = await this.redisService.get<SearchResult<any>>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for products search: ${cacheKey}`);
      return cached;
    }

    const result = await this.elasticsearchService.searchProducts(query, page, limit);

    const searchResult: SearchResult<any> = {
      data: result.hits,
      total: typeof result.total === 'object' ? result.total.value : result.total,
      page,
      limit,
      totalPages: Math.ceil(
        (typeof result.total === 'object' ? result.total.value : result.total) / limit,
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

    const result = await this.elasticsearchService.searchCategories(query, page, limit);

    const searchResult: SearchResult<any> = {
      data: result.hits,
      total: typeof result.total === 'object' ? result.total.value : result.total,
      page,
      limit,
      totalPages: Math.ceil(
        (typeof result.total === 'object' ? result.total.value : result.total) / limit,
      ),
    };

    await this.redisService.set(cacheKey, searchResult, this.CACHE_TTL);

    return searchResult;
  }

  async invalidateProductCache(): Promise<void> {
    this.logger.debug('Product cache invalidation requested');
  }

  async invalidateCategoryCache(): Promise<void> {
    this.logger.debug('Category cache invalidation requested');
  }
}
