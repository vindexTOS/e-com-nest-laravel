import laravelClient from './client';

export interface Product {
    id: string;
    name: string;
    slug: string;
    description?: string;
    image?: string;
    sku: string;
    price: number;
    compare_at_price?: number;
    cost_price?: number;
    stock: number;
    low_stock_threshold: number;
    weight?: number;
    status: 'draft' | 'active' | 'archived';
    is_featured: boolean;
    meta_title?: string;
    meta_description?: string;
    category_id?: string;
    category?: any;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string;
}

export interface ProductFilters {
    search?: string;
    status?: string;
    category_id?: string;
    per_page?: number;
    trashed?: boolean;
}

export const productsApi = {
    getAll: (filters?: ProductFilters) => {
        const params = new URLSearchParams();
        if (filters?.search) params.append('search', filters.search);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.category_id) params.append('category_id', filters.category_id);
        if (filters?.per_page) params.append('per_page', filters.per_page.toString());
        if (filters?.trashed) params.append('trashed', 'true');
        
        return laravelClient.get<{ data: Product[]; total: number; current_page: number; last_page: number }>(`/api/admin-api/admin/products?${params.toString()}`);
    },

    getById: (id: string) => laravelClient.get<Product>(`/api/admin-api/admin/products/${id}`),

    create: (data: FormData) => laravelClient.post<Product>('/api/admin-api/admin/products', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),

    update: (id: string, data: FormData) => {
        const formData = new FormData();
        formData.append('_method', 'PUT');
        Object.keys(data).forEach(key => {
            if (data[key] !== undefined && data[key] !== null) {
                formData.append(key, data[key]);
            }
        });
        return laravelClient.post<Product>(`/api/admin-api/admin/products/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    delete: (id: string) => laravelClient.delete(`/api/admin-api/admin/products/${id}`),

    restore: (id: string) => laravelClient.post(`/api/admin-api/admin/products/${id}/restore`),

    bulkDelete: (ids: string[]) => laravelClient.post('/api/admin-api/admin/products/bulk/delete', { ids }),

    bulkUpdate: (ids: string[], data: Partial<Product>) => laravelClient.post('/api/admin-api/admin/products/bulk/update', { ids, data }),

    import: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return laravelClient.post('/api/admin-api/admin/products/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    export: () => laravelClient.get('/api/admin-api/admin/products/export', { responseType: 'blob' }),
};

