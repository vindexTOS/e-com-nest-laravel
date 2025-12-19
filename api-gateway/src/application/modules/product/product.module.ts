import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../../domain/entities/product.entity';
import { ProductController } from '../../controllers/product/product.controller';
import { ProductsModule } from '../../../infrastructure/services/products/products.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), ProductsModule],
  controllers: [ProductController],
  exports: [TypeOrmModule],
})
export class ProductModule {}

