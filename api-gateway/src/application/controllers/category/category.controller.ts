import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { CategoriesService } from '../../../infrastructure/services/categories/categories.service';
import { Public } from '../../../infrastructure/libs/decorators/public.decorator';
import { ApiController } from '../../../infrastructure/libs/swagger/api-docs.decorator';

@ApiController('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private categoriesService: CategoriesService) {}

  @Public()
  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('parentId') parentId?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.categoriesService.findAll({
      page,
      limit,
      search,
      parentId,
      isActive,
    });
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }
}
