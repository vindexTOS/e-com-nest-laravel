import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../../../domain/entities/category.entity';
import { CategoryController } from '../../controllers/category/category.controller';
import { ProductsModule } from '../../../infrastructure/services/products/products.module';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), ProductsModule],
  controllers: [CategoryController],
  exports: [TypeOrmModule],
})
export class CategoryModule {}

