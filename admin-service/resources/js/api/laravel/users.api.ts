import laravelClient from './client';

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: 'customer' | 'admin';
    isActive: boolean;
    emailVerifiedAt?: string;
    ordersCount?: number;
    created_at?: string;
    updated_at?: string;
}

export interface UserFilters {
    search?: string;
    role?: string;
    is_active?: boolean;
    per_page?: number;
}

export const usersApi = {
    getAll: (filters?: UserFilters) => {
        const params = new URLSearchParams();
        if (filters?.search) params.append('search', filters.search);
        if (filters?.role) params.append('role', filters.role);
        if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
        if (filters?.per_page) params.append('per_page', filters.per_page.toString());
        
        return laravelClient.get<{ data: User[]; total: number }>(`/api/admin-api/admin/users?${params.toString()}`);
    },

    getById: (id: string) => laravelClient.get<User>(`/api/admin-api/admin/users/${id}`),

    create: (data: Partial<User> & { password: string }) => laravelClient.post<User>('/api/admin-api/admin/users', data),

    update: (id: string, data: Partial<User>) => {
        const formData = new FormData();
        formData.append('_method', 'PUT');
        Object.keys(data).forEach((key: any) => {
            if (data[key as keyof User] !== undefined && data[key as keyof User] !== null) {
                formData.append(key, data[key as keyof User]);
            }
        });
        return laravelClient.post<User>(`/api/admin-api/admin/users/${id}`, formData);
    },

    delete: (id: string) => laravelClient.delete(`/api/admin-api/admin/users/${id}`),
};

