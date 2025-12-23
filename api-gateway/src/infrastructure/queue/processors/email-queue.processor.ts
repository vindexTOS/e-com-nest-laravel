import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import {
  EmailService,
  OrderConfirmationEmailData,
} from '../../services/email/email.service';
import type { SendOrderEmailJobData } from '../../../domain/dto/queue/send-order-email-job.dto';

@Processor('email')
export class EmailQueueProcessor {
  private readonly logger = new Logger(EmailQueueProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  @Process('send-order-confirmation')
  async handleOrderConfirmationEmail(
    job: Job<SendOrderEmailJobData>,
  ): Promise<void> {
    const { data } = job;

    this.logger.log(
      `Processing order confirmation email job ${job.id} for order ${data.orderNumber}`,
    );

    try {
      const emailData: OrderConfirmationEmailData = {
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        orderNumber: data.orderNumber,
        orderDate: data.orderDate,
        items: data.items,
        subtotal: data.subtotal,
        tax: data.tax,
        shipping: data.shipping,
        discount: data.discount,
        total: data.total,
        shippingAddress: data.shippingAddress,
        billingAddress: data.billingAddress,
      };

      await this.emailService.sendOrderConfirmation(emailData);

      this.logger.log(
        `Successfully sent order confirmation email for order ${data.orderNumber}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to send order confirmation email for order ${data.orderNumber}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
