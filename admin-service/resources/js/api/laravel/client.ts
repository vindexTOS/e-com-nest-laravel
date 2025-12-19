import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const LARAVEL_API_URL = import.meta.env.VITE_LARAVEL_API_URL || window.location.origin;

const laravelClient: AxiosInstance = axios.create({
    baseURL: LARAVEL_API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    },
    timeout: 30000,
    withCredentials: true,
});

laravelClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (csrfToken && config.headers) {
            config.headers['X-CSRF-TOKEN'] = csrfToken;
        }

        const token = localStorage.getItem('accessToken');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

laravelClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                const response = await laravelClient.post('/api/admin-api/auth/refresh', { refreshToken });
                const { accessToken, refreshToken: newRefreshToken } = response.data;

                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', newRefreshToken);
                
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                }
                
                return laravelClient(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        if (error.response?.status === 419) {
            try {
                await axios.get(`${LARAVEL_API_URL}/sanctum/csrf-cookie`);
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                if (csrfToken && originalRequest?.headers) {
                    originalRequest.headers['X-CSRF-TOKEN'] = csrfToken;
                    return laravelClient(originalRequest);
                }
            } catch (csrfError) {
                console.error('CSRF token refresh failed:', csrfError);
            }
        }

        return Promise.reject(error);
    }
);

export default laravelClient;

