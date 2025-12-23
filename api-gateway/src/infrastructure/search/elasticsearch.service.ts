import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService as NestElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);

  constructor(
    private readonly elasticsearchService: NestElasticsearchService,
  ) {}

  async onModuleInit() {
    await this.ensureIndices();
  }

  private async ensureIndices() {
    try {
      const productIndexExists = await this.elasticsearchService.indices.exists(
        { index: 'products' },
      );
      if (!productIndexExists) {
        this.logger.log('Creating index: products');
        await this.elasticsearchService.indices.create({
          index: 'products',
          body: {
            mappings: {
              properties: {
                updatedAt: { type: 'date' },
                status: { type: 'keyword' },
                categoryId: { type: 'keyword' },
              },
            },
          },
        });
      }

      const categoryIndexExists =
        await this.elasticsearchService.indices.exists({ index: 'categories' });
      if (!categoryIndexExists) {
        this.logger.log('Creating index: categories');
        await this.elasticsearchService.indices.create({ index: 'categories' });
      }
    } catch (error) {
      this.logger.error('Error ensuring indices:', error);
    }
  }

  async indexProduct(product: any): Promise<void> {
    try {
      await this.elasticsearchService.index({
        index: 'products',
        id: product.id,
        document: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          sku: product.sku,
          price: product.price,
          stock: product.stock ?? null,
          lowStockThreshold:
            product.lowStockThreshold ?? product.low_stock_threshold ?? null,
          status: product.status,
          categoryId: product.categoryId ?? product.category_id ?? null,
          categoryName: product.category?.name ?? null,
          image: product.image || null,
          updatedAt:
            product.updatedAt ?? product.updated_at ?? new Date().toISOString(),
        },
      });
    } catch (error: any) {
      this.logger.error(`Error indexing product ${product.id}:`, error);
      throw error;
    }
  }

  async indexCategory(category: any): Promise<void> {
    try {
      await this.elasticsearchService.index({
        index: 'categories',
        id: category.id,
        document: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          parentId: category.parentId,
        },
      });
    } catch (error) {
      this.logger.error('Error indexing category:', error);
    }
  }

  async searchProducts(
    query: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    try {
      const from = (page - 1) * limit;

      const result = await this.elasticsearchService.search({
        index: 'products',
        body: {
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query,
                    fields: ['name^3', 'description^2', 'sku'],
                    fuzziness: 'AUTO',
                  },
                },
                {
                  term: {
                    status: 'active',
                  },
                },
              ],
            },
          },
          from,
          size: limit,
          sort: [{ _score: { order: 'desc' } }],
        },
      });

      return {
        hits: result.hits.hits.map((hit: any) => ({
          id: hit._source.id,
          ...hit._source,
          score: hit._score,
        })),
        total:
          typeof result.hits.total === 'object'
            ? result.hits.total.value
            : result.hits.total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Error searching products:', error);
      return { hits: [], total: 0, page, limit };
    }
  }

  async searchProductsWithFilters(params: {
    search?: string;
    categoryId?: string;
    status?: string;
    page: number;
    limit: number;
  }): Promise<any> {
    const { search, categoryId, status = 'active', page, limit } = params;
    try {
      const from = (page - 1) * limit;

      const must: any[] = [];
      const filter: any[] = [];

      if (search) {
        must.push({
          multi_match: {
            query: search,
            fields: ['name^3', 'description^2', 'sku'],
            fuzziness: 'AUTO',
          },
        });
      }

      if (status) {
        filter.push({ term: { status } });
      }

      if (categoryId) {
        filter.push({ term: { categoryId } });
      }

      const body: any = {
        query: {
          bool: {
            must: must.length ? must : [{ match_all: {} }],
            filter,
          },
        },
        from,
        size: limit,
        sort: [{ updatedAt: { order: 'desc', unmapped_type: 'date' } }],
      };

      const result = await this.elasticsearchService.search({
        index: 'products',
        body,
      });

      return {
        hits: result.hits.hits.map((hit: any) => ({
          id: hit._source.id,
          ...hit._source,
          score: hit._score,
        })),
        total:
          typeof result.hits.total === 'object'
            ? result.hits.total.value
            : result.hits.total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Error in searchProductsWithFilters:', error);
      return { hits: [], total: 0, page, limit };
    }
  }

  async getProductById(id: string): Promise<any | null> {
    try {
      const result = await this.elasticsearchService.get({
        index: 'products',
        id,
      });

      return result._source ? { id, ...result._source } : null;
    } catch (error) {
      this.logger.warn(`Product ${id} not found in Elasticsearch`);
      return null;
    }
  }

  async searchCategories(
    query: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    try {
      const from = (page - 1) * limit;

      const result = await this.elasticsearchService.search({
        index: 'categories',
        body: {
          query: {
            multi_match: {
              query,
              fields: ['name^2', 'description'],
              fuzziness: 'AUTO',
            },
          },
          from,
          size: limit,
        },
      });

      return {
        hits: result.hits.hits.map((hit: any) => ({
          id: hit._source.id,
          ...hit._source,
        })),
        total: result.hits.total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Error searching categories:', error);
      return { hits: [], total: 0, page, limit };
    }
  }

  async deleteProduct(id: string): Promise<void> {
    try {
      await this.elasticsearchService.delete({
        index: 'products',
        id,
      });
    } catch (error) {
      this.logger.error('Error deleting product from index:', error);
    }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      await this.elasticsearchService.delete({
        index: 'categories',
        id,
      });
    } catch (error) {
      this.logger.error('Error deleting category from index:', error);
    }
  }
}
