import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { emitAuthUnauthorized } from '../shared/utils/authEvents';

const GATEWAY_GRAPHQL_URL = `${window.location.origin}/api/gateway/graphql`;

type AnyObj = Record<string, any>;

interface GraphQLResponse<T> {
    data?: T;
    errors?: { message: string }[];
}

const client: AxiosInstance = axios.create({
    baseURL: GATEWAY_GRAPHQL_URL,
    timeout: 30000,
});

export const graphQLRequest = async <T>(query: string, variables?: AnyObj): Promise<T> => {
    const config: AxiosRequestConfig = {
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
    };

    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    }

    const data = { query, variables: variables || {} };

    try {
        const response = await client.post<GraphQLResponse<T>>('', data, config);
        if (response.data.errors?.length) {
            throw new Error(response.data.errors[0].message);
        }
        return response.data.data as T;
    } catch (error: any) {
        if (error?.response?.status === 401) {
            emitAuthUnauthorized();
        }
        throw error;
    }
};

