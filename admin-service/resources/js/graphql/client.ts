import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { emitAuthUnauthorized } from '../shared/utils/authEvents';

const GRAPHQL_URL =
 
    `${window.location.origin}/admin-api/graphql`;

type AnyObj = Record<string, any>;

interface GraphQLResponse<T> {
    data?: T;
    errors?: { message: string }[];
}

const client: AxiosInstance = axios.create({
    baseURL: GRAPHQL_URL,
    timeout: 30000,
});

const cloneWithoutFiles :any = (value: any, path: string, files: File[], map: Record<string, string[]>) => {
    if (value instanceof File || value instanceof Blob) {
        const idx = files.length.toString();
        files.push(value as File);
        map[idx] = [path];
        return null;
    }

    if (Array.isArray(value)) {
        return value.map((v, i) => cloneWithoutFiles(v, `${path}.${i}`, files, map));
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([k, v]) => [k, cloneWithoutFiles(v, `${path}.${k}`, files, map)])
        );
    }

    return value;
};

export const graphQLRequest = async <T>(query: string, variables?: AnyObj): Promise<T> => {
    const files: File[] = [];
    const map: Record<string, string[]> = {};
    const variablesClean = cloneWithoutFiles(variables || {}, 'variables', files, map);

    let data: any;
    let config: AxiosRequestConfig = {
        headers: {
            Accept: 'application/json',
        },
    };

    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    }

    if (files.length > 0) {
        const formData = new FormData();
        formData.append('operations', JSON.stringify({ query, variables: variablesClean }));
        formData.append('map', JSON.stringify(map));
        files.forEach((file, index) => formData.append(index.toString(), file));
        data = formData;
    } else {
        data = { query, variables: variablesClean };
        config.headers = { ...config.headers, 'Content-Type': 'application/json' };
    }

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


