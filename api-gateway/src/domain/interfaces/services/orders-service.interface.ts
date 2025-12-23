import { Order } from '../../entities/order.entity';

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

export interface IOrdersService {
  findAll(filters: {
    userId?: string;
    status?: string;
    fulfillmentStatus?: string;
    orderNumber?: string;
    limit?: number;
    offset?: number;
    withDeleted?: boolean;
  }): Promise<{ data: Order[]; total: number }>;
  findOne(id: string): Promise<Order>;
  createOrder(createOrderDto: CreateOrderDto): Promise<Order>;
  restore(id: string): Promise<Order>;
  softDelete(id: string): Promise<void>;
}

