import { graphQLRequest } from './client';

export const seedersGql = {
    seedProducts: async (count: number): Promise<void> => {
        const query = `
            mutation SeedProducts($count: Int) {
                seedProducts(count: $count) { message }
            }
        `;
        await graphQLRequest(query, { count });
    },
    seedUsers: async (count: number): Promise<void> => {
        const query = `
            mutation SeedUsers($count: Int) {
                seedUsers(count: $count) { message }
            }
        `;
        await graphQLRequest(query, { count });
    },
};


