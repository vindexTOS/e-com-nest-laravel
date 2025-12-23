import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  DefaultValuePipe,
  Post,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { IProductsService } from '../../../domain/interfaces/services';
import { Public } from '../../../infrastructure/libs/decorators/public.decorator';
import { ApiController } from '../../../infrastructure/libs/swagger/api-docs.decorator';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateProductDto } from '../../../domain/dto/product/create-product.dto';
import { UpdateProductDto } from '../../../domain/dto/product/update-product.dto';
import { Roles } from '../../../infrastructure/libs/decorators/roles.decorator';
import { RolesGuard } from '../../../infrastructure/libs/guards/roles.guard';
import { JwtAuthGuard } from '../../../infrastructure/libs/guards/jwt-auth.guard';
import { UserRole } from '../../../domain/entities/user.entity';

@ApiController('Products')
@Controller('products')
export class ProductController {
  constructor(private productsService: ProductsService) {}

  @Public()
  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('trashed') trashed?: string,
  ) {
    return this.productsService.getProducts({
      search,
      categoryId,
      status,
      page,
      limit,
      withDeleted: trashed === 'true',
    });
  }

  @Public()
  @Post('sync')
  async sync() {
    return this.productsService.syncToElasticsearch();
  }

  @Public()
  @Post('sync-from-write')
  async syncFromWrite() {
    return this.productsService.syncFromWriteDatabase();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get single product by ID' })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string) {
    return this.productsService.getProductById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product (Admin only)' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.createProduct(createProductDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing product (Admin only)' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(id, updateProductDto);
  }
}
