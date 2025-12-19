import { Controller, Get, Query, Param, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../../domain/entities/category.entity';
import { ProductsService } from '../../../infrastructure/services/products/products.service';
import { Public } from '../../../infrastructure/libs/decorators/public.decorator';
import { ApiController } from '../../../infrastructure/libs/swagger/api-docs.decorator';

@ApiController('Categories')
@Controller('categories')
export class CategoryController {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private productsService: ProductsService,
  ) {}

  @Public()
  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('parentId') parentId?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    if (search) {
      return this.productsService.searchCategories(search, page, limit);
    }

    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.parent', 'parent')
      .leftJoinAndSelect('category.children', 'children')
      .where('category.isActive = :isActive', { isActive: isActive !== false });

    if (parentId === 'null' || parentId === null) {
      queryBuilder.andWhere('category.parentId IS NULL');
    } else if (parentId) {
      queryBuilder.andWhere('category.parentId = :parentId', { parentId });
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

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.categoryRepository.findOne({
      where: { id },
      relations: ['parent', 'children', 'products'],
    });
  }
}

