import laravelClient from './client';

export interface RegisterDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
}

export interface LoginDto {
    email: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
    };
}

export const laravelAuthApi = {
    register: async (data: RegisterDto): Promise<LoginResponse> => {
        const response = await laravelClient.post<LoginResponse>('/api/admin-api/auth/register', data);
        return response.data;
    },

    login: async (data: LoginDto): Promise<LoginResponse> => {
        const response = await laravelClient.post<LoginResponse>('/api/admin-api/auth/login', data);
        return response.data;
    },

    refreshToken: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
        const response = await laravelClient.post<{ accessToken: string; refreshToken: string }>('/api/admin-api/auth/refresh', {
            refreshToken,
        });
        return response.data;
    },

    logout: async (refreshToken?: string): Promise<{ message: string }> => {
        const response = await laravelClient.post<{ message: string }>('/api/admin-api/auth/logout', {
            refreshToken,
        });
        return response.data;
    },
};

