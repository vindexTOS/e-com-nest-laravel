import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProductController } from './product/product.controller';
import { OrderController } from './order/order.controller';
import { UserController } from './user/user.controller';
import { StorageController } from './storage/storage.controller';
import { NotificationController } from './notification/notification.controller';
import { PaymentController } from './payment/payment.controller';
import { CategoryController } from './category/category.controller';
import { AuthController } from './auth/auth.controller';
import { UsersModule } from '../../infrastructure/services/users/users.module';
import { ProductsModule } from '../../infrastructure/services/products/products.module';
import { CategoriesModule } from '../../infrastructure/services/categories/categories.module';
import { OrdersModule } from '../../infrastructure/services/orders/orders.module';
import { PaymentModule } from '../../infrastructure/services/payment/payment.module';
import { NotificationsModule } from '../../infrastructure/services/notifications/notifications.module';
import { AuthModule } from '../../infrastructure/authentication/auth.module';

@Module({
  imports: [
    HttpModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    OrdersModule,
    PaymentModule,
    NotificationsModule,
    AuthModule,
  ],
  controllers: [
    ProductController,
    OrderController,
    UserController,
    StorageController,
    NotificationController,
    PaymentController,
    CategoryController,
    AuthController,
  ],
})
export class ControllersModule {}

