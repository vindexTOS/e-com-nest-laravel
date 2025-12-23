import { Product } from '../../entities/product.entity';
import { CreateProductDto } from '../../dto/product/create-product.dto';
import { UpdateProductDto } from '../../dto/product/update-product.dto';

export interface IProductsService {
  getProducts(params: {
    search?: string;
    categoryId?: string;
    status?: string;
    page?: number;
    limit?: number;
    withDeleted?: boolean;
  }): Promise<{
    data: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  getProductById(id: string): Promise<any>;
  createProduct(createProductDto: CreateProductDto): Promise<Product>;
  updateProduct(id: string, updateProductDto: UpdateProductDto): Promise<Product>;
  syncToElasticsearch(): Promise<{ message: string; productsCount: number }>;
  syncFromWriteDatabase(): Promise<{ message: string; synced: number }>;
}

