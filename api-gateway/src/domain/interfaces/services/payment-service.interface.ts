import { Order } from '../../entities/order.entity';
import { AddBalanceDto } from '../../dto/payment/add-balance.dto';
import { ProcessPaymentDto } from '../../dto/payment/process-payment.dto';
import { IBalanceResponse, IProcessPaymentResponse } from '../payment-response.interface';

export interface IPaymentService {
  addBalance(userId: string, addBalanceDto: AddBalanceDto): Promise<IBalanceResponse>;
  getBalance(userId: string): Promise<IBalanceResponse>;
  processPayment(userId: string, processPaymentDto: ProcessPaymentDto): Promise<IProcessPaymentResponse>;
}

