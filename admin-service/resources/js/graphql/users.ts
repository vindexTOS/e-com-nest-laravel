import { graphQLRequest } from './client';
import { User } from '../types';

export const usersGql = {
    create: async (input: Partial<User> & { password: string }): Promise<User> => {
        const mapped = {
            email: input.email,
            password: input.password,
            first_name: input.firstName ?? (input as any).first_name,
            last_name: input.lastName ?? (input as any).last_name,
            phone: input.phone,
            role: input.role,
            is_active: input.isActive ?? (input as any).is_active,
        };
        const query = `
            mutation CreateUser($input: CreateUserInput!) {
                createUser(input: $input) { id email first_name last_name role is_active }
            }
        `;
        const data = await graphQLRequest<{ createUser: any }>(query, { input: mapped });
        const u = data.createUser;
        return {
            id: u.id,
            email: u.email,
            firstName: u.first_name,
            lastName: u.last_name,
            role: u.role,
            isActive: u.is_active,
        };
    },

    update: async (id: string, input: Partial<User>): Promise<User> => {
        const mapped = {
            email: input.email,
            password: (input as any).password,
            first_name: input.firstName ?? (input as any).first_name,
            last_name: input.lastName ?? (input as any).last_name,
            phone: input.phone,
            role: input.role,
            is_active: input.isActive ?? (input as any).is_active,
        };
        const query = `
            mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
                updateUser(id: $id, input: $input) { id email first_name last_name role is_active }
            }
        `;
        const data = await graphQLRequest<{ updateUser: any }>(query, { id, input: mapped });
        const u = data.updateUser;
        return {
            id: u.id,
            email: u.email,
            firstName: u.first_name,
            lastName: u.last_name,
            role: u.role,
            isActive: u.is_active,
        };
    },

    delete: async (id: string): Promise<void> => {
        const query = `
            mutation DeleteUser($id: ID!) {
                deleteUser(id: $id) { message }
            }
        `;
        await graphQLRequest(query, { id });
    },

    restore: async (id: string): Promise<void> => {
        const query = `
            mutation RestoreUser($id: ID!) {
                restoreUser(id: $id) { message }
            }
        `;
        await graphQLRequest(query, { id });
    },
};


