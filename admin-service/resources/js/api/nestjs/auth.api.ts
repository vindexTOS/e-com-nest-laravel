import nestjsClient from './client';
import { LoginResponse  } from '../../shared/types/auth.types';

export const nestjsAuthApi = {
    register: async (data: any): Promise<LoginResponse> => {
        const response = await nestjsClient.post<LoginResponse>('/auth/register', data);
        return response.data;
    },

    login: async (data: any): Promise<LoginResponse> => {
        const response = await nestjsClient.post<LoginResponse>('/auth/login', data);
        return response.data;
    },

    refreshToken: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
        const response = await nestjsClient.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
            refreshToken,
        });
        return response.data;
    },

    logout: async (refreshToken?: string): Promise<{ message: string }> => {
        const response = await nestjsClient.post<{ message: string }>('/auth/logout', {
            refreshToken,
        });
        return response.data;
    },
};

