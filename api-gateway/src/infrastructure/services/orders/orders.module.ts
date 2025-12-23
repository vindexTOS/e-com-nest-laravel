import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { Order } from '../../../domain/entities/order.entity';
import { OrderItem } from '../../../domain/entities/order-item.entity';
import { Product } from '../../../domain/entities/product.entity';
import { User } from '../../../domain/entities/user.entity';
import { Notification } from '../../../domain/entities/notification.entity';
import { RedisModule } from '../../cache/redis.module';
import { BroadcastingModule } from '../broadcasting/broadcasting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    TypeOrmModule.forFeature([Product], 'write'),
    TypeOrmModule.forFeature([User], 'write'),
    TypeOrmModule.forFeature([Notification], 'write'),
    RedisModule,
    BroadcastingModule,
  ],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
