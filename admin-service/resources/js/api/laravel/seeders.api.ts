import laravelClient from './client';

export const seedersApi = {
    seedProducts: (count: number) => laravelClient.post('/api/admin-api/admin/seed/products', { count }),
    seedUsers: (count: number) => laravelClient.post('/api/admin-api/admin/seed/users', { count }),
};

