import {
  Controller,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { QueueService } from '../queue/queue.service';
import type { SendOrderEmailJobData } from '../../domain/dto/queue/send-order-email-job.dto';

@Controller()
export class OrderEventsController implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderEventsController.name);
  private readonly ORDER_EVENTS_CHANNEL = 'order-events';
  private subscriber: Redis;

  constructor(
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.logger.log('OrderEventsController initializing...');
    await new Promise((resolve) => setTimeout(resolve, 5000));
    this.logger.log('Starting order events subscription...');
    await this.subscribeToOrderEvents();
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.unsubscribe(this.ORDER_EVENTS_CHANNEL);
      await this.subscriber.quit();
    }
  }

  private async subscribeToOrderEvents(): Promise<void> {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'redis');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

    this.subscriber = new Redis({
      host: redisHost,
      port: redisPort,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.subscriber.subscribe(this.ORDER_EVENTS_CHANNEL, (err, count) => {
      if (err) {
        this.logger.error(
          `Failed to subscribe to ${this.ORDER_EVENTS_CHANNEL}:`,
          err,
        );
      } else {
        this.logger.log(
          `✅ Subscribed to ${this.ORDER_EVENTS_CHANNEL} channel (${count} channels)`,
        );
      }
    });

    this.subscriber.on('message', async (channel, message) => {
      if (channel === this.ORDER_EVENTS_CHANNEL) {
        this.logger.log(
          `📨 Received order event on ${channel}: ${message.substring(0, 150)}...`,
        );
        await this.handleOrderEvent(message);
      } else {
        this.logger.debug(`Received message on unexpected channel: ${channel}`);
      }
    });

    this.subscriber.on('error', (error) => {
      this.logger.error('Redis subscriber error:', error);
    });
  }

  private async handleOrderEvent(message: string): Promise<void> {
    try {
      const event = JSON.parse(message);
      this.logger.log(
        `Parsed event: event=${event.event}, hasData=${!!event.data}`,
      );

      if (event.event === 'order.created') {
        this.logger.log(
          `Processing order.created event, data keys: ${Object.keys(event.data || {}).join(', ')}`,
        );
        await this.handleOrderCreated(event.data);
      } else if (event.event === 'order.fulfilled') {
        this.logger.log(`Order fulfilled: ${event.data?.order_number}`);
      } else {
        this.logger.warn(`Unknown event type: ${event.event}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to handle order event: ${error.message}`,
        error.stack,
      );
    }
  }

  private async handleOrderCreated(orderData: any): Promise<void> {
    this.logger.log(
      `Processing order.created event for order: ${orderData.order_number}`,
    );
    this.logger.log(
      `Order data structure: user_email=${orderData.user_email}, user=${JSON.stringify(orderData.user ? { email: orderData.user.email, first_name: orderData.user.first_name, last_name: orderData.user.last_name } : 'null')}`,
    );

    const userEmail = orderData.user_email || orderData.user?.email;
    const orderNumber = orderData.order_number;

    if (!userEmail || !orderNumber) {
      this.logger.warn(
        `Order event missing required data (email: ${userEmail || 'MISSING'}, order_number: ${orderNumber || 'MISSING'}), skipping email`,
      );
      this.logger.warn(
        `Full order data keys: ${Object.keys(orderData).join(', ')}`,
      );
      if (orderData.user) {
        this.logger.warn(
          `User object keys: ${Object.keys(orderData.user).join(', ')}`,
        );
      }
      return;
    }

    this.logger.log(
      `✅ Order event has required data - email: ${userEmail}, order_number: ${orderNumber}`,
    );

    await this.addOrderConfirmationEmailToQueue(orderData).catch((err) => {
      this.logger.error(
        `Failed to add order confirmation email to queue: ${err.message}`,
      );
    });

    this.logger.log(
      `Order event processed successfully for order: ${orderData.order_number}`,
    );
  }

  private async addOrderConfirmationEmailToQueue(
    orderData: any,
  ): Promise<void> {
    const items = (orderData.items || []).map((item: any) => ({
      name: item.product_name || item.product?.name || item.name || 'Product',
      quantity: item.quantity || 1,
      price: parseFloat(
        item.unit_price || item.price || item.product?.price || 0,
      ),
      total: parseFloat(
        item.total_price ||
          item.total ||
          item.unit_price * item.quantity ||
          item.price * item.quantity ||
          0,
      ),
    }));

    const user = orderData.user || {};
    const customerName =
      orderData.user_name ||
      (user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`
        : null) ||
      user.name ||
      'Customer';

    const jobData: SendOrderEmailJobData = {
      orderId: orderData.id,
      orderNumber: orderData.order_number,
      customerEmail: orderData.user_email || user.email,
      customerName,
      orderDate: orderData.created_at
        ? new Date(orderData.created_at).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : new Date().toLocaleString(),
      items,
      subtotal: parseFloat(orderData.subtotal || 0),
      tax: parseFloat(orderData.tax || 0),
      shipping: parseFloat(orderData.shipping || 0),
      discount: parseFloat(orderData.discount || 0),
      total: parseFloat(orderData.total || 0),
      shippingAddress: orderData.shipping_address,
      billingAddress: orderData.billing_address,
    };

    this.logger.log(
      `📧 Adding order confirmation email job to queue for: ${jobData.customerEmail}`,
    );
    await this.queueService.addOrderConfirmationEmailJob(jobData);
    this.logger.log(
      `✅ Order confirmation email job added to queue for order ${jobData.orderNumber}`,
    );
  }
}
