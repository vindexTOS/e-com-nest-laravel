import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ElasticsearchService } from '../../search/elasticsearch.service';
import { RedisService } from '../../cache/redis.service';
import {
  Product,
  ProductStatus,
} from '../../../domain/entities/product.entity';
import { CreateProductDto } from '../../../domain/dto/product/create-product.dto';
import { UpdateProductDto } from '../../../domain/dto/product/update-product.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let elasticsearchService: jest.Mocked<ElasticsearchService>;
  let redisService: jest.Mocked<RedisService>;

  const mockElasticsearchService = {
    searchProductsWithFilters: jest.fn(),
    getProductById: jest.fn(),
    indexProduct: jest.fn(),
    syncToElasticsearch: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    publish: jest.fn().mockResolvedValue(1),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getMany: jest.fn(),
  };

  const mockProductRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockReadDataSource = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: ElasticsearchService,
          useValue: mockElasticsearchService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: getRepositoryToken(Product, 'read'),
          useValue: mockProductRepository,
        },
        {
          provide: getRepositoryToken(Product, 'write'),
          useValue: {},
        },
        {
          provide: getDataSourceToken('read'),
          useValue: mockReadDataSource,
        },
        {
          provide: getDataSourceToken('write'),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    elasticsearchService = module.get(ElasticsearchService);
    redisService = module.get(RedisService);

    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    it('should return products using productRepository and sync via ElasticsearchService', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', price: 100 },
        { id: '2', name: 'Product 2', price: 200 },
      ];

      mockReadDataSource.query.mockResolvedValue([]);
      mockElasticsearchService.indexProduct.mockResolvedValue(undefined);
      mockElasticsearchService.searchProductsWithFilters.mockResolvedValue({ hits: [], total: 0 });
      mockQueryBuilder.getCount.mockResolvedValue(2);
      mockQueryBuilder.getMany.mockResolvedValue(mockProducts);

      const result = await service.getProducts({
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual(mockProducts);
      expect(result.total).toBe(2);
    });

    it('should sync products to ElasticsearchService during getProducts', async () => {
      const mockProducts = [{ id: '1', name: 'Product 1', price: 100 }];
      const dbProduct = { id: '1', name: 'Product 1', updated_at: new Date(), deleted_at: null };

      mockReadDataSource.query
        .mockResolvedValueOnce([dbProduct])
        .mockResolvedValueOnce([]);
      mockElasticsearchService.searchProductsWithFilters
        .mockResolvedValueOnce({ hits: [], total: 0 })
        .mockResolvedValueOnce({
          hits: [{ id: '1', ...mockProducts[0] }],
          total: 1,
        });
      mockElasticsearchService.indexProduct.mockResolvedValue(undefined);
      mockProductRepository.find.mockResolvedValue(mockProducts);

      await service.getProducts({ page: 1, limit: 10, search: 'Product' });

      expect(mockElasticsearchService.indexProduct).toHaveBeenCalled();
      expect(mockElasticsearchService.searchProductsWithFilters).toHaveBeenCalled();
    });
  });

  describe('getProductById', () => {
    it('should return a product using ElasticsearchService', async () => {
      const mockProduct = { id: '1', name: 'Product 1', price: 100 };

      mockRedisService.get.mockResolvedValue(null);
      mockElasticsearchService.getProductById.mockResolvedValue(mockProduct);
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await service.getProductById('1');

      expect(result).toEqual(mockProduct);
      expect(elasticsearchService.getProductById).toHaveBeenCalledWith('1');
    });
  });

  describe('syncToElasticsearch', () => {
    it('should sync products to ElasticsearchService', async () => {
      const mockProducts = [
        {
          id: '1',
          name: 'Product 1',
          slug: 'product-1',
          description: 'Description 1',
          sku: 'SKU1',
          price: '100',
          compare_at_price: null,
          cost_price: null,
          stock: 10,
          low_stock_threshold: 5,
          weight: null,
          status: 'active',
          is_featured: false,
          meta_title: null,
          meta_description: null,
          category_id: null,
          image: null,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
        {
          id: '2',
          name: 'Product 2',
          slug: 'product-2',
          description: 'Description 2',
          sku: 'SKU2',
          price: '200',
          compare_at_price: null,
          cost_price: null,
          stock: 20,
          low_stock_threshold: 5,
          weight: null,
          status: 'active',
          is_featured: false,
          meta_title: null,
          meta_description: null,
          category_id: null,
          image: null,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      ];

      mockReadDataSource.query = jest.fn().mockResolvedValue(mockProducts);
      mockElasticsearchService.indexProduct = jest.fn().mockResolvedValue(undefined);

      const result = await service.syncToElasticsearch();

      expect(result.productsCount).toBe(2);
      expect(elasticsearchService.indexProduct).toHaveBeenCalledTimes(2);
    });
  });

  describe('createProduct', () => {
    it('should create a new product and sync to ElasticsearchService', async () => {
      const createDto: CreateProductDto = {
        name: 'Test Product',
        sku: 'TEST-001',
        price: 99.99,
        stock: 50,
        status: ProductStatus.ACTIVE,
      };

      const mockProduct = {
        id: '123',
        ...createDto,
        slug: 'test-product',
      };

      // Mock write repository methods
      const mockWriteRepo = {
        create: jest.fn().mockReturnValue(mockProduct),
        save: jest.fn().mockResolvedValue(mockProduct),
        findOne: jest.fn().mockResolvedValue(mockProduct),
      };

      const module = await Test.createTestingModule({
        providers: [
          ProductsService,
          {
            provide: ElasticsearchService,
            useValue: mockElasticsearchService,
          },
          {
            provide: RedisService,
            useValue: mockRedisService,
          },
          {
            provide: getRepositoryToken(Product, 'read'),
            useValue: mockProductRepository,
          },
          {
            provide: getRepositoryToken(Product, 'write'),
            useValue: mockWriteRepo,
          },
          {
            provide: getDataSourceToken('read'),
            useValue: mockReadDataSource,
          },
          {
            provide: getDataSourceToken('write'),
            useValue: {},
          },
        ],
      }).compile();

      const testService = module.get<ProductsService>(ProductsService);
      mockElasticsearchService.indexProduct.mockResolvedValue(undefined);
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await testService.createProduct(createDto);

      expect(result).toBeDefined();
      expect(mockElasticsearchService.indexProduct).toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalled();
    });
  });

  describe('updateProduct', () => {
    it('should update product and sync to ElasticsearchService', async () => {
      const existingProduct = {
        id: '123',
        name: 'Old Name',
        sku: 'TEST-001',
        price: 99.99,
        slug: 'old-name',
        category: null,
      };

      const updateDto: UpdateProductDto = {
        name: 'New Name',
        price: 149.99,
      };

      const mockWriteRepo = {
        findOne: jest.fn().mockResolvedValue(existingProduct),
        save: jest.fn().mockResolvedValue({ ...existingProduct, ...updateDto }),
      };

      const module = await Test.createTestingModule({
        providers: [
          ProductsService,
          {
            provide: ElasticsearchService,
            useValue: mockElasticsearchService,
          },
          {
            provide: RedisService,
            useValue: mockRedisService,
          },
          {
            provide: getRepositoryToken(Product, 'read'),
            useValue: mockProductRepository,
          },
          {
            provide: getRepositoryToken(Product, 'write'),
            useValue: mockWriteRepo,
          },
          {
            provide: getDataSourceToken('read'),
            useValue: mockReadDataSource,
          },
          {
            provide: getDataSourceToken('write'),
            useValue: {},
          },
        ],
      }).compile();

      const testService = module.get<ProductsService>(ProductsService);
      mockElasticsearchService.indexProduct.mockResolvedValue(undefined);
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await testService.updateProduct('123', updateDto);

      expect(result.name).toBe('New Name');
      expect(mockElasticsearchService.indexProduct).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product does not exist', async () => {
      const mockWriteRepo = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      const module = await Test.createTestingModule({
        providers: [
          ProductsService,
          {
            provide: ElasticsearchService,
            useValue: mockElasticsearchService,
          },
          {
            provide: RedisService,
            useValue: mockRedisService,
          },
          {
            provide: getRepositoryToken(Product, 'read'),
            useValue: mockProductRepository,
          },
          {
            provide: getRepositoryToken(Product, 'write'),
            useValue: mockWriteRepo,
          },
          {
            provide: getDataSourceToken('read'),
            useValue: mockReadDataSource,
          },
          {
            provide: getDataSourceToken('write'),
            useValue: {},
          },
        ],
      }).compile();

      const testService = module.get<ProductsService>(ProductsService);

      await expect(
        testService.updateProduct('non-existent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
