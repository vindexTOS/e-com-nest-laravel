import nestjsClient from './client';
import { Order } from '../../types/order';

export interface OrderListResponse {
    data: Order[];
    total: number;
    page?: number;
    limit?: number;
}

export interface OrderFilters {
    user_id?: string;
    status?: string;
    fulfillment_status?: string;
    order_number?: string;
    date_from?: string;
    date_to?: string;
    trashed?: boolean;
    limit?: number;
    offset?: number;
}

export const nestjsOrdersApi = {
    getAll: (filters?: OrderFilters) => {
        const params = new URLSearchParams();
        if (filters?.user_id) params.append('user_id', filters.user_id);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.fulfillment_status) params.append('fulfillment_status', filters.fulfillment_status);
        if (filters?.order_number) params.append('order_number', filters.order_number);
        if (filters?.date_from) params.append('date_from', filters.date_from);
        if (filters?.date_to) params.append('date_to', filters.date_to);
        if (filters?.trashed !== undefined) params.append('trashed', filters.trashed.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());
        if (filters?.offset !== undefined) params.append('offset', filters.offset.toString());

        return nestjsClient
            .get<OrderListResponse>(`/orders?${params.toString()}`)
            .catch(() => ({ data: { data: [], total: 0 } } as any));
    },
    getMyOrders: (filters?: { status?: string; fulfillment_status?: string; limit?: number; offset?: number }) => {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.fulfillment_status) params.append('fulfillment_status', filters.fulfillment_status);
        if (filters?.limit) params.append('limit', filters.limit.toString());
        if (filters?.offset !== undefined) params.append('offset', filters.offset.toString());

        return nestjsClient
            .get<OrderListResponse>(`/orders/my-orders${params.toString() ? `?${params.toString()}` : ''}`)
            .catch(() => ({ data: { data: [], total: 0 } } as any));
    },
    getById: (id: string) => nestjsClient.get<Order>(`/orders/${id}`),
    create: async (input: {
        userId?: string;
        items: Array<{
            productId: string;
            quantity: number;
        }>;
        shippingAddress?: string;
        billingAddress?: string;
        paymentMethod?: string;
        notes?: string;
    }): Promise<Order> => {
        const response = await nestjsClient.post<Order>('/orders', input);
        return response.data;
    },
};


