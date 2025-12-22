import nestjsClient from './client';
 

export interface CategoryListResponse {
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const nestjsCategoriesApi = {
    getAll: (options?: { page?: number; limit?: number; search?: string; parentId?: string | null }) => {
        const params = new URLSearchParams();
        if (options?.page) params.append('page', options.page.toString());
        if (options?.limit) params.append('limit', options.limit.toString());
        if (options?.search) params.append('search', options.search);
        if (options?.parentId !== undefined) params.append('parentId', options.parentId as any);

        return nestjsClient.get<CategoryListResponse>(`/categories?${params.toString()}`);
    },
    getById: (id: string) => nestjsClient.get<any>(`/categories/${id}`),
};


