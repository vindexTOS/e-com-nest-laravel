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
        const response = await nestjsClient.get<User>('/api/gateway/users/me');
        return response.data;
    },

    updateMe: async (data: Partial<User>): Promise<User> => {
        const response = await nestjsClient.put<User>('/api/gateway/users/me', data);
        return response.data;
    },

    getUsers: async (params?: { page?: number; limit?: number }): Promise<{ data: User[]; total: number }> => {
        const response = await nestjsClient.get<{ data: User[]; total: number }>('/api/gateway/users', { params });
        return response.data;
    },

    getUserById: async (id: string): Promise<User> => {
        const response = await nestjsClient.get<User>(`/api/gateway/users/${id}`);
        return response.data;
    },
};

