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

export interface CreateProductInput {
    name: string;
    description?: string;
    sku: string;
    price: number;
    compareAtPrice?: number;
    costPrice?: number;
    stock?: number;
    lowStockThreshold?: number;
    weight?: number;
    status?: 'draft' | 'active' | 'archived';
    isFeatured?: boolean;
    metaTitle?: string;
    metaDescription?: string;
    categoryId?: string;
    slug?: string;
    image?: string;
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

    create: async (input: CreateProductInput): Promise<any> => {
        const response = await nestjsClient.post('/products', input);
        return response.data;
    },

    update: async (id: string, input: Partial<CreateProductInput>): Promise<any> => {
        const response = await nestjsClient.put(`/products/${id}`, input);
        return response.data;
    },
};


