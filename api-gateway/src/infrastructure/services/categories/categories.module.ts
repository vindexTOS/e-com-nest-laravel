import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { ICategoriesService } from '../../../domain/interfaces/services';
import { Category } from '../../../domain/entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  providers: [
    CategoriesService,
    {
      provide: 'ICategoriesService',
      useClass: CategoriesService,
    },
  ],
  exports: ['ICategoriesService', CategoriesService],
})
export class CategoriesModule {}
