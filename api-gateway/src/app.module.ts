import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from './infrastructure/persistence/database.module';
import { RedisModule } from './infrastructure/cache/redis.module';
import { ElasticsearchModule } from './infrastructure/search/elasticsearch.module';
import { ProductModule } from './application/modules/product/product.module';
import { CategoryModule } from './application/modules/category/category.module';
import { OrderModule } from './application/modules/order/order.module';
import { AdminSeeder } from './infrastructure/persistence/seeders/admin.seeder';
import { AuthModule } from './infrastructure/authentication/auth.module';
import { JwtAuthGuard } from './infrastructure/libs/guards/jwt-auth.guard';
import { RolesGuard } from './infrastructure/libs/guards/roles.guard';
import { User } from './domain/entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    TypeOrmModule.forFeature([User]),
    RedisModule,
    ElasticsearchModule,
    AuthModule,
    ProductModule,
    CategoryModule,
    OrderModule,
  ],
  controllers: [],
  providers: [
    AdminSeeder,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
