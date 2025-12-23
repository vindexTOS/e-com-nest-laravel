import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { User } from '../../../domain/entities/user.entity';
import { Order } from '../../../domain/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Order], 'write')],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
