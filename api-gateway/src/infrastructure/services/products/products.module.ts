import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { RedisModule } from '../../cache/redis.module';
import { ElasticsearchModule } from '../../search/elasticsearch.module';
import { DatabaseModule } from '../../persistence/database.module';
import { Product } from '../../../domain/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product], 'read'),
    TypeOrmModule.forFeature([Product], 'write'),
    DatabaseModule,
    RedisModule,
    ElasticsearchModule,
  ],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
