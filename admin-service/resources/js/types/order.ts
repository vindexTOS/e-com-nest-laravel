import { User } from './user';

export interface Order {
    id: string;
    orderNumber?: string;
    order_number?: string; // Support both formats
    status?: string;
    fulfillmentStatus?: string;
    fulfillment_status?: string; // Support both formats
    paymentStatus?: string;
    payment_status?: string; // Support both formats
    total?: number;
    createdAt?: string;
    created_at?: string; // Support both formats
    user?: User | null;
    items?: Array<{
        id?: string;
        productName?: string;
        product_name?: string; // Support both formats
        productSku?: string;
        product_sku?: string; // Support both formats
        quantity?: number;
        unitPrice?: number;
        unit_price?: number; // Support both formats
        totalPrice?: number;
        total_price?: number; // Support both formats
    }>;
}

