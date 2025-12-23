import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, DeepPartial } from 'typeorm';
import { Order } from '../../../domain/entities/order.entity';
import { OrderItem } from '../../../domain/entities/order-item.entity';
import { Product } from '../../../domain/entities/product.entity';
import { User } from '../../../domain/entities/user.entity';
import { Notification } from '../../../domain/entities/notification.entity';
import { RedisService } from '../../cache/redis.service';
import { SoketiService } from '../broadcasting/soketi.service';

export interface CreateOrderDto {
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  shippingAddress?: string;
  billingAddress?: string;
  paymentMethod?: string;
  notes?: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product, 'write')
    private writeProductRepository: Repository<Product>,
    @InjectRepository(User, 'write')
    private writeUserRepository: Repository<User>,
    @InjectRepository(Notification, 'write')
    private writeNotificationRepository: Repository<Notification>,
    @InjectDataSource('write')
    private writeDataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly soketiService: SoketiService,
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

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const queryRunner = this.writeDataSource.createQueryRunner();
    await queryRunner.connect();
    let transactionStarted = false;
    await queryRunner.startTransaction();
    transactionStarted = true;

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: createOrderDto.userId },
      });

      if (!user) {
        throw new NotFoundException(
          `User with ID ${createOrderDto.userId} not found`,
        );
      }

      const orderNumber = this.generateOrderNumber();

      let subtotal = 0;
      const orderItems: Partial<OrderItem>[] = [];

      for (const item of createOrderDto.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(
            `Product with ID ${item.productId} not found`,
          );
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
          );
        }

        const itemTotal = parseFloat(product.price.toString()) * item.quantity;
        subtotal += itemTotal;

        product.stock -= item.quantity;
        await queryRunner.manager.save(Product, product);

        orderItems.push({
          productId: item.productId,
          productName: product.name,
          productSku: product.sku,
          quantity: item.quantity,
          unitPrice: parseFloat(product.price.toString()),
          totalPrice: itemTotal,
          quantityFulfilled: 0,
        });
      }

      const tax = subtotal * 0.1; // 10% tax
      const shipping = 0; // Free shipping
      const discount = 0;
      const total = subtotal + tax + shipping - discount;

      const order = new Order();
      order.userId = createOrderDto.userId;
      order.orderNumber = orderNumber;
      order.status = 'pending' as any;
      order.fulfillmentStatus = 'unfulfilled' as any;
      order.subtotal = subtotal;
      order.tax = tax;
      order.shipping = shipping;
      order.discount = discount;
      order.total = total;
      order.currency = 'USD';
      order.shippingAddress = createOrderDto.shippingAddress || null;
      order.billingAddress = createOrderDto.billingAddress || null;
      order.paymentMethod = createOrderDto.paymentMethod || null;
      order.paymentStatus = 'pending';
      order.notes = createOrderDto.notes || null;

      const savedOrder = await queryRunner.manager.save(Order, order);

      for (const itemData of orderItems) {
        const orderItem = queryRunner.manager.create(OrderItem, {
          ...itemData,
          orderId: savedOrder.id,
        });
        await queryRunner.manager.save(OrderItem, orderItem);
      }

      const notification = queryRunner.manager.create(Notification, {
        userId: null,
        type: 'order_created',
        title: 'New Order Received',
        message: `Order ${orderNumber} placed by ${user.firstName} ${user.lastName} for $${total.toFixed(2)}`,
        data: {
          order_id: savedOrder.id,
          order_number: orderNumber,
          user_name: `${user.firstName} ${user.lastName}`,
          user_email: user.email,
          total: total,
          items_count: orderItems.length,
        },
      });

      const savedNotification = await queryRunner.manager.save(
        Notification,
        notification,
      );

      const freshOrder = await queryRunner.manager.findOne(Order, {
        where: { id: savedOrder.id },
        relations: ['user', 'items', 'items.product'],
      });

      if (!freshOrder) {
        throw new NotFoundException('Order not found after creation');
      }

      await queryRunner.commitTransaction();

      await this.publishDatabaseEvent('orders', 'INSERT', freshOrder);

      for (const item of freshOrder.items) {
        await this.publishDatabaseEvent('order_items', 'INSERT', item);
      }

      await this.publishDatabaseEvent(
        'notifications',
        'INSERT',
        savedNotification,
      );

      await this.publishOrderCreatedEvent(freshOrder, user);

      const notificationData = {
        id: savedNotification.id,
        user_id: savedNotification.userId,
        type: savedNotification.type,
        title: savedNotification.title,
        message: savedNotification.message,
        data: savedNotification.data,
        read_at: savedNotification.readAt,
        created_at: savedNotification.createdAt,
        updated_at: savedNotification.updatedAt,
      };
      await this.soketiService.broadcastAdminNotification(notificationData);

      await this.publishNotificationEvent(savedNotification);

      this.logger.log(`Order created: ${orderNumber} by user ${user.email}`);

      return freshOrder;
    } catch (error) {
      if (transactionStarted) {
        try {
          await queryRunner.rollbackTransaction();
        } catch (rollbackError) {
          this.logger.error(
            `Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : rollbackError}`,
          );
        }
      }
      this.logger.error(
        `Failed to create order: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `ORD-${timestamp}-${random}`;
  }

  private async publishDatabaseEvent(
    table: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    data: any,
  ): Promise<void> {
    try {
      const eventData = {
        table,
        operation,
        data: this.serializeForDatabaseEvent(data, table),
        id: data.id,
        timestamp: new Date().toISOString(),
      };

      const message = JSON.stringify(eventData);
      await this.redisService.publish('database:events', message);

      this.logger.log(
        `Published database event: ${operation} on ${table} (${data.id})`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to publish database event: ${error.message}`,
        error.stack,
      );
    }
  }

  private async publishOrderCreatedEvent(
    order: Order,
    user: User,
  ): Promise<void> {
    try {
      const eventData = {
        event: 'order.created',
        data: {
          id: order.id,
          user_id: order.userId,
          user_email: user.email,
          user_name: `${user.firstName} ${user.lastName}`,
          order_number: order.orderNumber,
          status: order.status,
          fulfillment_status: order.fulfillmentStatus,
          subtotal: order.subtotal,
          tax: order.tax,
          shipping: order.shipping,
          discount: order.discount,
          total: order.total,
          currency: order.currency,
          shipping_address: order.shippingAddress,
          billing_address: order.billingAddress,
          payment_method: order.paymentMethod,
          payment_status: order.paymentStatus,
          notes: order.notes,
          items: (order.items || []).map((item) => ({
            id: item.id,
            product_id: item.productId,
            product_name: item.productName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.totalPrice,
            product: item.product
              ? {
                  id: item.product.id,
                  name: item.product.name,
                  price: item.product.price,
                }
              : null,
          })),
          user: {
            id: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
          },
          created_at: order.createdAt,
          updated_at: order.updatedAt,
        },
        timestamp: new Date().toISOString(),
      };

      await this.redisService.publish(
        'order-events',
        JSON.stringify(eventData),
      );
      this.logger.log(`Published order.created event for ${order.orderNumber}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to publish order.created event: ${error.message}`,
        error.stack,
      );
    }
  }

  private async publishNotificationEvent(
    notification: Notification,
  ): Promise<void> {
    try {
      const eventData = {
        event: 'notification.created',
        data: {
          id: notification.id,
          user_id: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          read_at: notification.readAt,
          created_at: notification.createdAt,
          updated_at: notification.updatedAt,
        },
        timestamp: new Date().toISOString(),
      };

      await this.redisService.publish(
        'notification-events',
        JSON.stringify(eventData),
      );
      this.logger.log(
        `Published notification.created event for ${notification.id}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to publish notification event: ${error.message}`,
        error.stack,
      );
    }
  }

  private serializeForDatabaseEvent(data: any, table: string): any {
    if (table === 'orders') {
      return {
        id: data.id,
        user_id: data.userId,
        order_number: data.orderNumber,
        status: data.status,
        fulfillment_status: data.fulfillmentStatus,
        subtotal: data.subtotal,
        tax: data.tax,
        shipping: data.shipping,
        discount: data.discount,
        total: data.total,
        currency: data.currency,
        shipping_address: data.shippingAddress,
        billing_address: data.billingAddress,
        payment_method: data.paymentMethod,
        payment_status: data.paymentStatus,
        fulfilled_at: data.fulfilledAt,
        shipped_at: data.shippedAt,
        delivered_at: data.deliveredAt,
        notes: data.notes,
        created_at: data.createdAt,
        updated_at: data.updatedAt,
      };
    } else if (table === 'order_items') {
      return {
        id: data.id,
        order_id: data.orderId,
        product_id: data.productId,
        product_name: data.productName,
        product_sku: data.productSku,
        quantity: data.quantity,
        unit_price: data.unitPrice,
        total_price: data.totalPrice,
        quantity_fulfilled: data.quantityFulfilled,
        created_at: data.createdAt,
        updated_at: data.updatedAt,
      };
    } else if (table === 'notifications') {
      return {
        id: data.id,
        user_id: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data,
        read_at: data.readAt,
        created_at: data.createdAt,
        updated_at: data.updatedAt,
      };
    }
    return data;
  }
}
