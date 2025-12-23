import nestjsClient from './client';

export interface AddBalanceInput {
  amount: number;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
}

export interface ProcessPaymentInput {
  orderId: string;
  paymentMethod?: 'wallet_balance' | 'credit_card';
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  cardholderName?: string;
}

export interface BalanceResponse {
  balance: number;
  message: string;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  order: any;
}

export const paymentApi = {
  getBalance: async (): Promise<BalanceResponse> => {
    const response = await nestjsClient.get('/payment/balance');
    return response.data;
  },

  addBalance: async (input: AddBalanceInput): Promise<BalanceResponse> => {
    const response = await nestjsClient.post('/payment/add-balance', {
      amount: input.amount,
      cardNumber: input.cardNumber.replace(/\s+/g, ''),
      cardExpiry: input.cardExpiry,
      cardCvv: input.cardCvv,
    });
    return response.data;
  },

  processPayment: async (input: ProcessPaymentInput): Promise<PaymentResponse> => {
    const response = await nestjsClient.post('/payment/process', {
      orderId: input.orderId,
      paymentMethod: input.paymentMethod || 'wallet_balance',
      cardNumber: input.cardNumber?.replace(/\s+/g, ''),
      cardExpiry: input.cardExpiry,
      cardCvv: input.cardCvv,
      cardholderName: input.cardholderName,
    });
    return response.data;
  },
};

