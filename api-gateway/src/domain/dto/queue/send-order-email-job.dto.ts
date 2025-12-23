export interface SendOrderEmailJobData {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
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

