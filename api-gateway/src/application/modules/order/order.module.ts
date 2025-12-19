import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../../domain/entities/order.entity';
import { OrderItem } from '../../../domain/entities/order-item.entity';
import { OrdersService } from '../../../infrastructure/services/orders/orders.service';
import { OrderController } from '../../controllers/order/order.controller';
import { InternalOrderController } from '../../controllers/internal/internal-order.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem])],
  controllers: [OrderController, InternalOrderController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrderModule {}

