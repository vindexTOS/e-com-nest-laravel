import laravelClient from './client';

export interface Order {
    id: string;
    user_id: string;
    user?: any;
    order_number: string;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    fulfillment_status: 'unfulfilled' | 'partial' | 'fulfilled';
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
    currency: string;
    shipping_address?: string;
    billing_address?: string;
    payment_method?: string;
    payment_status: string;
    fulfilled_at?: string;
    shipped_at?: string;
    delivered_at?: string;
    notes?: string;
    items?: OrderItem[];
    created_at?: string;
    updated_at?: string;
    deleted_at?: string;
}

export interface OrderItem {
    id: string;
    order_id: string;
    product_id: string;
    product?: any;
    product_name: string;
    product_sku: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    quantity_fulfilled: number;
}

export interface OrderFilters {
    user_id?: string;
    status?: string;
    fulfillment_status?: string;
    order_number?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    trashed?: boolean;
}

export const ordersApi = {
    getAll: (filters?: OrderFilters) => {
        const params = new URLSearchParams();
        if (filters?.user_id) params.append('user_id', filters.user_id);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.fulfillment_status) params.append('fulfillment_status', filters.fulfillment_status);
        if (filters?.order_number) params.append('order_number', filters.order_number);
        if (filters?.date_from) params.append('date_from', filters.date_from);
        if (filters?.date_to) params.append('date_to', filters.date_to);
        if (filters?.limit) params.append('limit', filters.limit.toString());
        if (filters?.trashed) params.append('trashed', 'true');
        
        return laravelClient.get<{ data: Order[]; total: number }>(`/api/admin-api/admin/orders?${params.toString()}`);
    },

    getById: (id: string) => laravelClient.get<Order>(`/api/admin-api/admin/orders/${id}`),

    create: (data: any) => laravelClient.post<Order>('/api/admin-api/admin/orders', data),

    update: (id: string, data: Partial<Order>) => laravelClient.put<Order>(`/api/admin-api/admin/orders/${id}`, data),

    delete: (id: string) => laravelClient.delete(`/api/admin-api/admin/orders/${id}`),

    restore: (id: string) => laravelClient.post(`/api/admin-api/admin/orders/${id}/restore`),

    fulfill: (id: string) => laravelClient.post<Order>(`/api/admin-api/admin/orders/${id}/fulfill`),

    getReports: (period: 'daily' | 'weekly' | 'monthly', dateFrom?: string, dateTo?: string) => {
        const params = new URLSearchParams();
        params.append('period', period);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        return laravelClient.get(`/api/admin-api/admin/orders/reports/sales?${params.toString()}`);
    },

    export: (format: 'csv' | 'pdf' = 'csv') => laravelClient.get(`/api/admin-api/admin/orders/export?format=${format}`, { responseType: 'blob' }),
};

