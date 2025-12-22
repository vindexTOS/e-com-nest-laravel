import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Category } from '../../../domain/entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async findAll(filters: {
  page?: number;
  limit?: number;
  search?: string;
  parentId?: string;
  isActive?: boolean;
}): Promise<{
  data: Category[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = filters.page || 1;
  const limit = filters.limit || 10;

  const queryBuilder = this.categoryRepository
    .createQueryBuilder('category')
    .leftJoinAndSelect('category.parent', 'parent')
    .leftJoinAndSelect('category.children', 'children')
    .where('category.deleted_at IS NULL')  
    .andWhere('category.isActive = :isActive', {
      isActive: filters.isActive !== false,
    });

  if (filters.search) {
    queryBuilder.andWhere(
      `(category.name ILIKE :search OR category.description ILIKE :search)`,
      { search: `%${filters.search}%` }
    );
  }

  if (filters.parentId === 'null' || filters.parentId === null) {
    queryBuilder.andWhere('category.parentId IS NULL');
  } else if (filters.parentId) {
    queryBuilder.andWhere('category.parentId = :parentId', {
      parentId: filters.parentId,
    });
  }

  queryBuilder.orderBy('category.sortOrder', 'ASC');

  const [data, total] = await queryBuilder
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async findByParentId(parentId: string | null): Promise<Category[]> {
    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.children', 'children')
      .where('category.isActive = true');

    if (parentId === null) {
      queryBuilder.andWhere('category.parentId IS NULL');
    } else {
      queryBuilder.andWhere('category.parentId = :parentId', { parentId });
    }

    queryBuilder.orderBy('category.sortOrder', 'ASC');

    return queryBuilder.getMany();
  }

  async getCategoryTree(): Promise<Category[]> {
    const categories = await this.categoryRepository.find({
      where: { isActive: true },
      relations: ['children'],
      order: { sortOrder: 'ASC' },
    });

    // Build tree structure
    const categoryMap = new Map<string, Category>();
    const roots: Category[] = [];

    // First pass: create map
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    // Second pass: build tree
    categories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category.id)!;

      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(categoryWithChildren);
        }
      } else {
        roots.push(categoryWithChildren);
      }
    });

    return roots;
  }
}
