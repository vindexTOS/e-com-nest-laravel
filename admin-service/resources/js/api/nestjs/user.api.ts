import nestjsClient from './client';

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
}

export const nestjsUserApi = {
    getMe: async (): Promise<User> => {
        try {
            const response = await nestjsClient.get<User>('/users/me');
            return response.data;
        } catch {
            throw new Error('User profile endpoint unavailable');
        }
    },

    updateMe: async (data: Partial<User>): Promise<User> => {
        const response = await nestjsClient.put<User>('/users/me', data);
        return response.data;
    },

    getUsers: async (params?: { page?: number; limit?: number }): Promise<{ data: User[]; total: number }> => {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 15;
        const offset = (page - 1) * limit;
        const response = await nestjsClient.get<{ data: User[]; total: number }>('/users', {
            params: { limit, offset },
        });

        const body: any = response.data;
        const data = Array.isArray(body?.data) ? body.data : [];
        const total = typeof body?.total === 'number' ? body.total : data.length;
        return { data, total };
    },

    getUserById: async (id: string): Promise<User | null> => {
        try {
            const response = await nestjsClient.get<User>(`/users/${id}`);
            return response.data;
        } catch {
            return null;
        }
    },
};

