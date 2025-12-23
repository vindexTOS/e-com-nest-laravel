import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../../../domain/entities/user.entity';
import { Order } from '../../../domain/entities/order.entity';
import { ProcessPaymentDto } from '../../../domain/dto/payment/process-payment.dto';
import { AddBalanceDto } from '../../../domain/dto/payment/add-balance.dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(User, 'write')
    private readonly writeUserRepository: Repository<User>,
    @InjectRepository(Order, 'write')
    private readonly writeOrderRepository: Repository<Order>,
    @InjectDataSource('write')
    private readonly writeDataSource: DataSource,
  ) {}

  async addBalance(userId: string, addBalanceDto: AddBalanceDto): Promise<{ balance: number; message: string }> {
    const queryRunner = this.writeDataSource.createQueryRunner();
    await queryRunner.connect();
    let transactionStarted = false;

    try {
      await queryRunner.startTransaction();
      transactionStarted = true;

      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      this.validateCard(addBalanceDto.cardNumber, addBalanceDto.cardExpiry, addBalanceDto.cardCvv);

      const currentBalance = parseFloat(user.balance?.toString() || '0');
      const newBalance = currentBalance + addBalanceDto.amount;

      user.balance = newBalance;
      await queryRunner.manager.save(User, user);

      await queryRunner.commitTransaction();

      this.logger.log(`Added $${addBalanceDto.amount} to user ${userId} balance. New balance: $${newBalance}`);

      return {
        balance: newBalance,
        message: `Successfully added $${addBalanceDto.amount} to your balance`,
      };
    } catch (error) {
      if (transactionStarted) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getBalance(userId: string): Promise<{ balance: number; message: string }> {
    const user = await this.writeUserRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const balance = parseFloat(user.balance?.toString() || '0');

    return {
      balance,
      message: 'Balance retrieved successfully',
    };
  }

  async processPayment(userId: string, processPaymentDto: ProcessPaymentDto): Promise<{ success: boolean; message: string; order: Order }> {
    const queryRunner = this.writeDataSource.createQueryRunner();
    await queryRunner.connect();
    let transactionStarted = false;

    try {
      await queryRunner.startTransaction();
      transactionStarted = true;

      const order = await queryRunner.manager.findOne(Order, {
        where: { id: processPaymentDto.orderId },
        relations: ['user', 'items'],
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${processPaymentDto.orderId} not found`);
      }

      if (order.userId !== userId) {
        throw new BadRequestException('You can only pay for your own orders');
      }

      if (order.paymentStatus === 'paid') {
        throw new BadRequestException('Order is already paid');
      }

      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const paymentMethod = processPaymentDto.paymentMethod || 'wallet_balance';
      const orderTotal = parseFloat(order.total.toString());

      if (paymentMethod === 'wallet_balance') {
        const userBalance = parseFloat(user.balance?.toString() || '0');

        if (userBalance < orderTotal) {
          throw new BadRequestException(
            `Insufficient balance. Required: $${orderTotal.toFixed(2)}, Available: $${userBalance.toFixed(2)}. Please add funds to your account.`,
          );
        }

        user.balance = userBalance - orderTotal;
        await queryRunner.manager.save(User, user);

        order.paymentMethod = 'wallet_balance';
        order.paymentStatus = 'paid';
        order.status = 'processing' as any;

        this.logger.log(`Processed payment via wallet balance for order ${order.orderNumber}. Deducted $${orderTotal}`);
      } else if (paymentMethod === 'credit_card') {
        this.validateCard(
          processPaymentDto.cardNumber!,
          processPaymentDto.cardExpiry!,
          processPaymentDto.cardCvv!,
        );

        this.processMockCreditCardPayment(
          processPaymentDto.cardNumber!,
          processPaymentDto.cardExpiry!,
          processPaymentDto.cardCvv!,
          orderTotal,
        );

        order.paymentMethod = 'credit_card';
        order.paymentStatus = 'paid';
        order.status = 'processing' as any;

        this.logger.log(`Processed payment via credit card for order ${order.orderNumber}. Amount: $${orderTotal}`);
      } else {
        throw new BadRequestException(`Invalid payment method: ${paymentMethod}`);
      }

      await queryRunner.manager.save(Order, order);
      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Payment processed successfully',
        order,
      };
    } catch (error) {
      if (transactionStarted) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private validateCard(cardNumber: string, cardExpiry: string, cardCvv: string): void {
    const cleanCardNumber = cardNumber.replace(/\s+/g, '');

    if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      throw new BadRequestException('Invalid card number. Must be 13-19 digits.');
    }

    if (!/^\d+$/.test(cleanCardNumber)) {
      throw new BadRequestException('Card number must contain only digits');
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) {
      throw new BadRequestException('Invalid expiry format. Use MM/YY');
    }

    const [month, year] = cardExpiry.split('/');
    const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
    const now = new Date();

    if (expiryDate < now) {
      throw new BadRequestException('Card has expired');
    }

    if (!/^\d{3,4}$/.test(cardCvv)) {
      throw new BadRequestException('CVV must be 3-4 digits');
    }
  }

  private processMockCreditCardPayment(
    cardNumber: string,
    cardExpiry: string,
    cardCvv: string,
    amount: number,
  ): void {
    this.logger.log('═══════════════════════════════════════════════════════════');
    this.logger.log('💳 MOCK PAYMENT - Credit Card Processing');
    this.logger.log('═══════════════════════════════════════════════════════════');
    this.logger.log(`Card Number: ${this.maskCardNumber(cardNumber)}`);
    this.logger.log(`Expiry: ${cardExpiry}`);
    this.logger.log(`CVV: ***`);
    this.logger.log(`Amount: $${amount.toFixed(2)}`);
    this.logger.log('───────────────────────────────────────────────────────────');
    this.logger.log('✅ MOCK: Payment authorized successfully');
    this.logger.log('✅ MOCK: Transaction ID: ' + this.generateTransactionId());
    this.logger.log('═══════════════════════════════════════════════════════════');
  }

  private maskCardNumber(cardNumber: string): string {
    const clean = cardNumber.replace(/\s+/g, '');
    if (clean.length <= 4) return '****';
    return '**** **** **** ' + clean.slice(-4);
  }

  private generateTransactionId(): string {
    return 'TXN-' + Date.now() + '-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  }
}

