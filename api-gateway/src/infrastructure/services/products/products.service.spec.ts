import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ElasticsearchService } from '../../search/elasticsearch.service';
import { RedisService } from '../../cache/redis.service';
import { Product, ProductStatus } from '../../../domain/entities/product.entity';
import { CreateProductDto } from '../../../domain/dto/product/create-product.dto';
import { UpdateProductDto } from '../../../domain/dto/product/update-product.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let elasticsearchService: jest.Mocked<ElasticsearchService>;
  let redisService: jest.Mocked<RedisService>;
  let productRepository: jest.Mocked<Repository<Product>>;

  const mockElasticsearchService = {
    searchProductsWithFilters: jest.fn(),
    getProductById: jest.fn(),
    indexProduct: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockProductRepository = {
    find: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
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
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    elasticsearchService = module.get(ElasticsearchService);
    redisService = module.get(RedisService);
    productRepository = module.get(getRepositoryToken(Product));

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    it('should return products from Elasticsearch with cache', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', price: 100 },
        { id: '2', name: 'Product 2', price: 200 },
      ];

      mockRedisService.get.mockResolvedValue(null);
      mockElasticsearchService.searchProductsWithFilters.mockResolvedValue({
        hits: mockProducts,
        total: { value: 2 },
      });
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await service.getProducts({
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual(mockProducts);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(elasticsearchService.searchProductsWithFilters).toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should return cached products if available', async () => {
      const cachedResult = {
        data: [{ id: '1', name: 'Cached Product' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockRedisService.get.mockResolvedValue(cachedResult);

      const result = await service.getProducts({ page: 1, limit: 10 });

      expect(result).toEqual(cachedResult);
      expect(elasticsearchService.searchProductsWithFilters).not.toHaveBeenCalled();
    });
  });

  describe('getProductById', () => {
    it('should return a product by id', async () => {
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
    it('should sync products to Elasticsearch', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', category: null },
        { id: '2', name: 'Product 2', category: null },
      ];

      mockProductRepository.find.mockResolvedValue(mockProducts as any);
      mockElasticsearchService.indexProduct.mockResolvedValue(undefined);
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await service.syncToElasticsearch();

      expect(result.productsCount).toBe(2);
      expect(productRepository.find).toHaveBeenCalledWith({ relations: ['category'] });
      expect(elasticsearchService.indexProduct).toHaveBeenCalledTimes(2);
    });
  });

  describe('createProduct', () => {
    it('should create a new product with auto-generated slug', async () => {
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
        lowStockThreshold: 10,
        isFeatured: false,
      };

      mockProductRepository.create.mockReturnValue(mockProduct as any);
      mockProductRepository.save.mockResolvedValue(mockProduct as any);
      mockElasticsearchService.indexProduct.mockResolvedValue(undefined);
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await service.createProduct(createDto);

      expect(result).toEqual(mockProduct);
      expect(productRepository.create).toHaveBeenCalled();
      expect(productRepository.save).toHaveBeenCalled();
      expect(elasticsearchService.indexProduct).toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should create product with provided slug', async () => {
      const createDto: CreateProductDto = {
        name: 'Test Product',
        sku: 'TEST-002',
        price: 49.99,
        slug: 'custom-slug',
      };

      const mockProduct = {
        id: '124',
        ...createDto,
        slug: 'custom-slug',
        stock: 0,
        status: ProductStatus.DRAFT,
        lowStockThreshold: 10,
        isFeatured: false,
      };

      mockProductRepository.create.mockReturnValue(mockProduct as any);
      mockProductRepository.save.mockResolvedValue(mockProduct as any);
      mockElasticsearchService.indexProduct.mockResolvedValue(undefined);
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await service.createProduct(createDto);

      expect(result.slug).toBe('custom-slug');
      expect(productRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'custom-slug' })
      );
    });

    it('should set default values for optional fields', async () => {
      const createDto: CreateProductDto = {
        name: 'Minimal Product',
        sku: 'MIN-001',
        price: 19.99,
      };

      const mockProduct = {
        id: '125',
        ...createDto,
        slug: 'minimal-product',
        stock: 0,
        status: ProductStatus.DRAFT,
        lowStockThreshold: 10,
        isFeatured: false,
      };

      mockProductRepository.create.mockReturnValue(mockProduct as any);
      mockProductRepository.save.mockResolvedValue(mockProduct as any);
      mockElasticsearchService.indexProduct.mockResolvedValue(undefined);
      mockRedisService.set.mockResolvedValue(undefined);

      await service.createProduct(createDto);

      expect(productRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          stock: 0,
          status: ProductStatus.DRAFT,
          lowStockThreshold: 10,
          isFeatured: false,
        })
      );
    });
  });

  describe('updateProduct', () => {
    it('should update an existing product', async () => {
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

      const updatedProduct = {
        ...existingProduct,
        ...updateDto,
        slug: 'new-name',
      };

      mockProductRepository.findOne.mockResolvedValue(existingProduct as any);
      mockProductRepository.save.mockResolvedValue(updatedProduct as any);
      mockElasticsearchService.indexProduct.mockResolvedValue(undefined);
      mockRedisService.set.mockResolvedValue(undefined);

      const result = await service.updateProduct('123', updateDto);

      expect(result.name).toBe('New Name');
      expect(result.price).toBe(149.99);
      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123' },
        relations: ['category'],
      });
      expect(productRepository.save).toHaveBeenCalled();
      expect(elasticsearchService.indexProduct).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product does not exist', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateProduct('non-existent', { name: 'New Name' })
      ).rejects.toThrow(NotFoundException);

      expect(productRepository.save).not.toHaveBeenCalled();
    });

    it('should auto-generate slug when name is updated', async () => {
      const existingProduct = {
        id: '123',
        name: 'Old Name',
        sku: 'TEST-001',
        price: 99.99,
        slug: 'old-name',
        category: null,
      };

      const updateDto: UpdateProductDto = {
        name: 'Updated Product Name',
      };

      mockProductRepository.findOne.mockResolvedValue(existingProduct as any);
      mockProductRepository.save.mockResolvedValue({
        ...existingProduct,
        ...updateDto,
        slug: 'updated-product-name',
      } as any);
      mockElasticsearchService.indexProduct.mockResolvedValue(undefined);
      mockRedisService.set.mockResolvedValue(undefined);

      await service.updateProduct('123', updateDto);

      expect(productRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'updated-product-name' })
      );
    });

    it('should preserve existing slug if provided in update', async () => {
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
        slug: 'custom-slug',
      };

      mockProductRepository.findOne.mockResolvedValue(existingProduct as any);
      mockProductRepository.save.mockResolvedValue({
        ...existingProduct,
        ...updateDto,
      } as any);
      mockElasticsearchService.indexProduct.mockResolvedValue(undefined);
      mockRedisService.set.mockResolvedValue(undefined);

      await service.updateProduct('123', updateDto);

      expect(productRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'custom-slug' })
      );
    });
  });
});

