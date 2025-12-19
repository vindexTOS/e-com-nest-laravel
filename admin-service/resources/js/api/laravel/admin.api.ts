import laravelClient from './client';

export interface AdminUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
}

export interface AdminLoginResponse {
    accessToken: string;
    refreshToken: string;
    user: AdminUser;
}

export const laravelAdminApi = {
    login: async (data: { email: string; password: string }): Promise<AdminLoginResponse> => {
        const response = await laravelClient.post<AdminLoginResponse>('/api/admin-api/admin/login', data);
        return response.data;
    },

    logout: async (): Promise<{ message: string }> => {
        const response = await laravelClient.post<{ message: string }>('/api/admin-api/admin/logout');
        return response.data;
    },

    getUser: async (): Promise<AdminUser> => {
        const response = await laravelClient.get<AdminUser>('/api/admin-api/admin/user');
        return response.data;
    },
};

