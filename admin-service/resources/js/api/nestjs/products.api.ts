import nestjsClient from './client';
 

export interface ProductListResponse {
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ProductFilters {
    search?: string;
    status?: string;
    categoryId?: string;
    limit?: number;
    page?: number;
    trashed?: string;
}

export const nestjsProductsApi = {
    getAll: (filters?: ProductFilters) => {
        const params = new URLSearchParams();
        if (filters?.search) params.append('search', filters.search);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.categoryId) params.append('categoryId', filters.categoryId);
        if (filters?.limit) params.append('limit', filters.limit.toString());
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.trashed) params.append('trashed', filters.trashed);

        return nestjsClient.get<ProductListResponse>(`/products?${params.toString()}`);
    },

    getById: (id: string) => nestjsClient.get<any>(`/products/${id}`),
};


