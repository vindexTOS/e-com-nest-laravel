import { graphQLRequest } from './client';

export interface AuthUser {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    isActive?: boolean;
}

export interface AuthPayload {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
}

const mapUser = (u: any): AuthUser => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName ?? u.first_name,
    lastName: u.lastName ?? u.last_name,
    role: u.role,
    isActive: u.isActive ?? u.is_active,
});

export const authGql = {
    register: async (input: { email: string; password: string; firstName: string; lastName: string; phone?: string }): Promise<AuthPayload> => {
        const query = `
            mutation Register($input: RegisterInput!) {
                register(input: $input) {
                    accessToken
                    refreshToken
                    user { id email first_name last_name role is_active }
                }
            }
        `;
        const data = await graphQLRequest<{ register: any }>(query, { input });
        const payload = data.register;
        return {
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
            user: mapUser(payload.user),
        };
    },

    login: async (input: { email: string; password: string }): Promise<AuthPayload> => {
        const query = `
            mutation Login($input: LoginInput!) {
                login(input: $input) {
                    accessToken
                    refreshToken
                    user { id email first_name last_name role is_active }
                }
            }
        `;
        const data = await graphQLRequest<{ login: any }>(query, { input });
        const payload = data.login;
        return {
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
            user: mapUser(payload.user),
        };
    },

    adminLogin: async (input: { email: string; password: string }): Promise<AuthPayload> => {
        const query = `
            mutation AdminLogin($input: LoginInput!) {
                adminLogin(input: $input) {
                    accessToken
                    refreshToken
                    user { id email first_name last_name role is_active }
                }
            }
        `;
        const data = await graphQLRequest<{ adminLogin: any }>(query, { input });
        const payload = data.adminLogin;
        return {
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
            user: mapUser(payload.user),
        };
    },

    refresh: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
        const query = `
            mutation Refresh($refreshToken: String!) {
                refreshToken(refreshToken: $refreshToken) {
                    accessToken
                    refreshToken
                }
            }
        `;
        const data = await graphQLRequest<{ refreshToken: { accessToken: string; refreshToken: string } }>(query, { refreshToken });
        return data.refreshToken;
    },

    logout: async (refreshToken?: string): Promise<void> => {
        const query = `
            mutation Logout($refreshToken: String) {
                logout(refreshToken: $refreshToken) { message }
            }
        `;
        await graphQLRequest(query, { refreshToken });
    },
};


