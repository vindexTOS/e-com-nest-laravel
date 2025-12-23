import { Order } from '../entities/order.entity';

export interface IBalanceResponse {
  balance: number;
  message: string;
}

export interface IProcessPaymentResponse {
  success: boolean;
  message: string;
  order: Order;
}
