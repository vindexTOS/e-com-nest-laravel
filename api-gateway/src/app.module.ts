import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from './infrastructure/persistence/database.module';
import { RedisModule } from './infrastructure/cache/redis.module';
import { ElasticsearchModule } from './infrastructure/search/elasticsearch.module';
import { AuthModule } from './infrastructure/authentication/auth.module';
import { GqlModule } from './infrastructure/graphql/graphql.module';
import { JwtAuthGuard } from './infrastructure/libs/guards/jwt-auth.guard';
import { RolesGuard } from './infrastructure/libs/guards/roles.guard';
import { JwtWsGuard } from './infrastructure/libs/guards/jwt-ws.guard';
import { User } from './domain/entities/user.entity';
import { ProductController } from './application/controllers/product/product.controller';
import { OrderController } from './application/controllers/order/order.controller';
import { UserController } from './application/controllers/user/user.controller';
import { StorageController } from './application/controllers/storage/storage.controller';
import { NotificationController } from './application/controllers/notification/notification.controller';
import { UsersService } from './infrastructure/services/users/users.service';
import { ProductsModule } from './infrastructure/services/products/products.module';
import { CategoriesModule } from './infrastructure/services/categories/categories.module';
import { OrdersModule } from './infrastructure/services/orders/orders.module';
import { NotificationsModule } from './infrastructure/services/notifications/notifications.module';
import { UsersGateway } from './infrastructure/websockets/users.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HttpModule,
    DatabaseModule,
    TypeOrmModule.forFeature([User]),
    RedisModule,
    ElasticsearchModule,
    AuthModule,
    GqlModule,
    ProductsModule,
    CategoriesModule,
    OrdersModule,
    NotificationsModule,
  ],
  controllers: [ProductController, OrderController, UserController, StorageController, NotificationController],
  providers: [
    UsersService,
    UsersGateway,
    JwtWsGuard,
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
