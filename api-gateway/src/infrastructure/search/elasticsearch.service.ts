import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService as NestElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class ElasticsearchService {
  private readonly logger = new Logger(ElasticsearchService.name);

  constructor(
    private readonly elasticsearchService: NestElasticsearchService,
  ) {}

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
          status: product.status,
          categoryId: product.categoryId,
          categoryName: product.category?.name,
        },
      });
    } catch (error) {
      this.logger.error('Error indexing product:', error);
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

  async searchProducts(query: string, page: number = 1, limit: number = 10): Promise<any> {
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
        total: result.hits.total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Error searching products:', error);
      return { hits: [], total: 0, page, limit };
    }
  }

  async searchCategories(query: string, page: number = 1, limit: number = 10): Promise<any> {
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

