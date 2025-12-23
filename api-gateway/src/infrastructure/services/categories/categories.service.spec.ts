import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from '../../../domain/entities/category.entity';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
  };

  const mockCategoryRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepository,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return categories with pagination', async () => {
      const mockCategories = [
        { id: '1', name: 'Category 1', isActive: true },
        { id: '2', name: 'Category 2', isActive: true },
      ];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockCategories, 2]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toEqual(mockCategories);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by search term', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ search: 'electronics' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      const mockCategory = {
        id: '1',
        name: 'Category 1',
        parent: null,
        children: [],
      };

      mockCategoryRepository.findOne.mockResolvedValue(mockCategory as any);

      const result = await service.findOne('1');

      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException if category not found', async () => {
      mockCategoryRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getCategoryTree', () => {
    it('should return category tree structure', async () => {
      const mockCategories = [
        {
          id: '1',
          name: 'Root 1',
          parentId: null,
          sortOrder: 1,
          children: [],
        },
        {
          id: '2',
          name: 'Child 1',
          parentId: '1',
          sortOrder: 1,
          children: [],
        },
      ];

      mockCategoryRepository.find.mockResolvedValue(mockCategories as any);

      const result = await service.getCategoryTree();

      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(1);
    });
  });
});
