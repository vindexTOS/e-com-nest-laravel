export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'customer';
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
    user: User;
}

