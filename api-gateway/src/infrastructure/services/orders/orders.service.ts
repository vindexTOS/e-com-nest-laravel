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
  }): Promise<{ data: Order[]; total: number }> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product');

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
      query.andWhere('order.orderNumber = :orderNumber', {
        orderNumber: filters.orderNumber,
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

  async syncOrder(orderData: any): Promise<Order> {
    const existingOrder = await this.orderRepository.findOne({
      where: { id: orderData.id },
    });

    if (existingOrder) {
      Object.assign(existingOrder, {
        userId: orderData.user_id,
        orderNumber: orderData.order_number,
        status: orderData.status,
        fulfillmentStatus: orderData.fulfillment_status,
        subtotal: parseFloat(orderData.subtotal),
        tax: parseFloat(orderData.tax),
        shipping: parseFloat(orderData.shipping),
        discount: parseFloat(orderData.discount),
        total: parseFloat(orderData.total),
        currency: orderData.currency,
        shippingAddress: orderData.shipping_address,
        billingAddress: orderData.billing_address,
        paymentMethod: orderData.payment_method,
        paymentStatus: orderData.payment_status,
        fulfilledAt: orderData.fulfilled_at ? new Date(orderData.fulfilled_at) : null,
        shippedAt: orderData.shipped_at ? new Date(orderData.shipped_at) : null,
        deliveredAt: orderData.delivered_at ? new Date(orderData.delivered_at) : null,
        notes: orderData.notes,
      });

      await this.orderRepository.save(existingOrder);

      await this.orderItemRepository.delete({ orderId: orderData.id });

      for (const itemData of orderData.items || []) {
        const orderItem = this.orderItemRepository.create({
          id: itemData.id,
          orderId: itemData.order_id,
          productId: itemData.product_id,
          productName: itemData.product_name,
          productSku: itemData.product_sku,
          quantity: itemData.quantity,
          unitPrice: parseFloat(itemData.unit_price),
          totalPrice: parseFloat(itemData.total_price),
          quantityFulfilled: itemData.quantity_fulfilled,
        });
        await this.orderItemRepository.save(orderItem);
      }

      return this.findOne(orderData.id);
    } else {
      const order = this.orderRepository.create({
        id: orderData.id,
        userId: orderData.user_id,
        orderNumber: orderData.order_number,
        status: orderData.status,
        fulfillmentStatus: orderData.fulfillment_status,
        subtotal: parseFloat(orderData.subtotal),
        tax: parseFloat(orderData.tax),
        shipping: parseFloat(orderData.shipping),
        discount: parseFloat(orderData.discount),
        total: parseFloat(orderData.total),
        currency: orderData.currency,
        shippingAddress: orderData.shipping_address,
        billingAddress: orderData.billing_address,
        paymentMethod: orderData.payment_method,
        paymentStatus: orderData.payment_status,
        fulfilledAt: orderData.fulfilled_at ? new Date(orderData.fulfilled_at) : null,
        shippedAt: orderData.shipped_at ? new Date(orderData.shipped_at) : null,
        deliveredAt: orderData.delivered_at ? new Date(orderData.delivered_at) : null,
        notes: orderData.notes,
      });

      await this.orderRepository.save(order);

      for (const itemData of orderData.items || []) {
        const orderItem = this.orderItemRepository.create({
          id: itemData.id,
          orderId: itemData.order_id,
          productId: itemData.product_id,
          productName: itemData.product_name,
          productSku: itemData.product_sku,
          quantity: itemData.quantity,
          unitPrice: parseFloat(itemData.unit_price),
          totalPrice: parseFloat(itemData.total_price),
          quantityFulfilled: itemData.quantity_fulfilled,
        });
        await this.orderItemRepository.save(orderItem);
      }

      return this.findOne(orderData.id);
    }
  }
}

