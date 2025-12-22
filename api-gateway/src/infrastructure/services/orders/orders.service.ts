import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../../domain/entities/order.entity';
import { OrderItem } from '../../../domain/entities/order-item.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
  ) {}

  async findAll(filters: {
    userId?: string;
    status?: string;
    fulfillmentStatus?: string;
    orderNumber?: string;
    limit?: number;
    offset?: number;
    withDeleted?: boolean;
  }): Promise<{ data: Order[]; total: number }> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product');

    if (filters.withDeleted) {
      query.withDeleted().andWhere('order.deletedAt IS NOT NULL');
    } else {
      query.andWhere('order.deletedAt IS NULL');
    }

    if (filters.userId) {
      query.andWhere('order.userId = :userId', { userId: filters.userId });
    }

    if (filters.status) {
      query.andWhere('order.status = :status', { status: filters.status });
    }

    if (filters.fulfillmentStatus) {
      query.andWhere('order.fulfillmentStatus = :fulfillmentStatus', {
        fulfillmentStatus: filters.fulfillmentStatus,
      });
    }

    if (filters.orderNumber) {
      query.andWhere('order.orderNumber ILIKE :orderNumber', {
        orderNumber: `%${filters.orderNumber}%`,
      });
    }

    query.orderBy('order.createdAt', 'DESC');

    const total = await query.getCount();

    if (filters.limit) {
      query.limit(filters.limit);
    }
    if (filters.offset) {
      query.offset(filters.offset);
    }

    const data = await query.getMany();

    return { data, total };
  }

  async restore(id: string): Promise<Order> {
    const result = await this.orderRepository.restore(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return this.findOne(id);
  }

  async softDelete(id: string): Promise<void> {
    const result = await this.orderRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['user', 'items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }
}

