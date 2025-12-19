import nestjsClient from './client';
import { LoginResponse, RegisterDto, LoginDto } from '../../shared/types/auth.types';

export const nestjsAuthApi = {
    register: async (data: RegisterDto): Promise<LoginResponse> => {
        const response = await nestjsClient.post<LoginResponse>('/api/gateway/auth/register', data);
        return response.data;
    },

    login: async (data: LoginDto): Promise<LoginResponse> => {
        const response = await nestjsClient.post<LoginResponse>('/api/gateway/auth/login', data);
        return response.data;
    },

    refreshToken: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
        const response = await nestjsClient.post<{ accessToken: string; refreshToken: string }>('/api/gateway/auth/refresh', {
            refreshToken,
        });
        return response.data;
    },

    logout: async (refreshToken?: string): Promise<{ message: string }> => {
        const response = await nestjsClient.post<{ message: string }>('/api/gateway/auth/logout', {
            refreshToken,
        });
        return response.data;
    },
};

