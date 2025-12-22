import { Resolver, Query, Args, ID } from '@nestjs/graphql';
import { CategoryType, CategoriesPaginatedResponse } from '../../../domain/graphql/types/category.type';
import { CategoriesFilterInput } from '../../../domain/graphql/inputs/category.input';
import { CategoriesService } from '../../../infrastructure/services/categories/categories.service';
import { Public } from '../../../infrastructure/libs/decorators/public.decorator';

@Resolver(() => CategoryType)
export class CategoryResolver {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Query(() => CategoriesPaginatedResponse, { name: 'categories' })
  async findAll(
    @Args('filter', { nullable: true }) filter?: CategoriesFilterInput,
  ): Promise<CategoriesPaginatedResponse> {
    return this.categoriesService.findAll({
      page: filter?.page ?? 1,
      limit: filter?.limit ?? 10,
      search: filter?.search,
      parentId: filter?.parentId,
      isActive: filter?.isActive,
    });
  }

  @Public()
  @Query(() => CategoryType, { name: 'category' })
  async findOne(@Args('id', { type: () => ID }) id: string): Promise<CategoryType> {
    return this.categoriesService.findOne(id);
  }
}

