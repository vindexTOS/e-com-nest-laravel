import { Order } from '../entities/order.entity';

export interface IOrdersListResponse {
  data: Order[];
  total: number;
}
