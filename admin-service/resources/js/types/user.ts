export type UserRole = 'customer' | 'admin';

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    role: UserRole;
    isActive: boolean;
    emailVerifiedAt?: string;
    ordersCount?: number;
    created_at?: string;
    updated_at?: string;
}

