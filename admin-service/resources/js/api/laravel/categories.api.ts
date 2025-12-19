import laravelClient from './client';

export interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string;
    parent_id?: string;
    parent?: Category;
    children?: Category[];
    image?: string;
    is_active: boolean;
    sort_order: number;
    meta_title?: string;
    meta_description?: string;
    products_count?: number;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string;
}

export const categoriesApi = {
    getAll: (filters?: { search?: string; parent_id?: string; root_only?: boolean; is_active?: boolean; trashed?: boolean }) => {
        const params = new URLSearchParams();
        if (filters?.search) params.append('search', filters.search);
        if (filters?.parent_id) params.append('parent_id', filters.parent_id);
        if (filters?.root_only) params.append('root_only', 'true');
        if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
        if (filters?.trashed) params.append('trashed', 'true');
        
        return laravelClient.get<{ data: Category[] }>(`/api/admin-api/admin/categories?${params.toString()}`);
    },

    getById: (id: string) => laravelClient.get<Category>(`/api/admin-api/admin/categories/${id}`),

    create: (data: FormData) => laravelClient.post<Category>('/api/admin-api/admin/categories', data, {
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
        return laravelClient.post<Category>(`/api/admin-api/admin/categories/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    delete: (id: string) => laravelClient.delete(`/api/admin-api/admin/categories/${id}`),

    restore: (id: string) => laravelClient.post(`/api/admin-api/admin/categories/${id}/restore`),
};

