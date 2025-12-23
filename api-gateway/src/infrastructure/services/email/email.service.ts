import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OrderConfirmationEmailData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  orderDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  shippingAddress?: string;
  billingAddress?: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log(
      'EmailService initialized (MOCK MODE - emails will be logged only)',
    );
  }

  async sendOrderConfirmation(data: OrderConfirmationEmailData): Promise<void> {
    this.logger.log('MOCK EMAIL - Order Confirmation');
    this.logger.log(`To: ${data.customerEmail}`);
    this.logger.log(`Subject: Order Confirmation - ${data.orderNumber}`);
    this.logger.log(`Customer: ${data.customerName}`);
    this.logger.log(`Order Number: ${data.orderNumber}`);
    this.logger.log(`Order Date: ${data.orderDate}`);
    this.logger.log(`Items Count: ${data.items.length}`);
    this.logger.log(`Subtotal: $${data.subtotal.toFixed(2)}`);
    this.logger.log(`Tax: $${data.tax.toFixed(2)}`);
    this.logger.log(`Shipping: $${data.shipping.toFixed(2)}`);
    this.logger.log(`Discount: $${data.discount.toFixed(2)}`);
    this.logger.log(`Total: $${data.total.toFixed(2)}`);
    if (data.shippingAddress) {
      this.logger.log(`Shipping Address: ${data.shippingAddress}`);
    }
    this.logger.log('Order Items:');
    data.items.forEach((item, index) => {
      this.logger.log(
        `  ${index + 1}. ${item.name} x${item.quantity} @ $${item.price.toFixed(2)} = $${item.total.toFixed(2)}`,
      );
    });
    this.logger.log('Email content (HTML preview):');
    this.logger.log(
      this.generateOrderConfirmationHTML(data).substring(0, 500) + '...',
    );
    this.logger.log(
      `MOCK: Order confirmation email would be sent to ${data.customerEmail}`,
    );
  }

  private generateOrderConfirmationHTML(
    data: OrderConfirmationEmailData,
  ): string {
    const itemsHtml = data.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e9ecef; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e9ecef; text-align: right;">$${item.price.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e9ecef; text-align: right;">$${item.total.toFixed(2)}</td>
      </tr>
    `,
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            margin: -30px -30px 30px -30px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .order-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-left: 4px solid #667eea;
            border-radius: 4px;
            margin: 20px 0;
          }
          .order-info p {
            margin: 8px 0;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .items-table th {
            background-color: #667eea;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
          }
          .items-table td {
            padding: 12px;
            border-bottom: 1px solid #e9ecef;
          }
          .total-section {
            margin-top: 20px;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 8px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
          }
          .total-row:last-child {
            border-bottom: none;
            font-weight: bold;
            font-size: 18px;
            color: #667eea;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 2px solid #667eea;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e9ecef;
            text-align: center;
            color: #6c757d;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmation</h1>
          </div>
          
          <p>Dear ${data.customerName},</p>
          
          <p>Thank you for your order! We've received your order and it's being processed.</p>
          
          <div class="order-info">
            <p><strong>Order Number:</strong> ${data.orderNumber}</p>
            <p><strong>Order Date:</strong> ${data.orderDate}</p>
            ${data.shippingAddress ? `<p><strong>Shipping Address:</strong> ${data.shippingAddress}</p>` : ''}
          </div>
          
          <h3>Order Items:</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="total-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>$${data.subtotal.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Tax:</span>
              <span>$${data.tax.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Shipping:</span>
              <span>$${data.shipping.toFixed(2)}</span>
            </div>
            ${
              data.discount > 0
                ? `
            <div class="total-row">
              <span>Discount:</span>
              <span>-$${data.discount.toFixed(2)}</span>
            </div>
            `
                : ''
            }
            <div class="total-row">
              <span>Total:</span>
              <span>$${data.total.toFixed(2)}</span>
            </div>
          </div>
          
          <p style="margin-top: 30px;">We'll send you another email when your order ships.</p>
          
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>Sent on ${new Date().toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateOrderConfirmationText(
    data: OrderConfirmationEmailData,
  ): string {
    const itemsText = data.items
      .map(
        (item) =>
          `${item.name} x${item.quantity} - $${item.price.toFixed(2)} each = $${item.total.toFixed(2)}`,
      )
      .join('\n');

    return `
Order Confirmation

Dear ${data.customerName},

Thank you for your order! We've received your order and it's being processed.

Order Number: ${data.orderNumber}
Order Date: ${data.orderDate}
${data.shippingAddress ? `Shipping Address: ${data.shippingAddress}\n` : ''}

Order Items:
${itemsText}

Subtotal: $${data.subtotal.toFixed(2)}
Tax: $${data.tax.toFixed(2)}
Shipping: $${data.shipping.toFixed(2)}
${data.discount > 0 ? `Discount: -$${data.discount.toFixed(2)}\n` : ''}
Total: $${data.total.toFixed(2)}

We'll send you another email when your order ships.

---
This is an automated email. Please do not reply to this message.
    `.trim();
  }
}
