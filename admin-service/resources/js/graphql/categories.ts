import { graphQLRequest as adminGraphQLRequest } from './client';
import { graphQLRequest as gatewayGraphQLRequest } from './gatewayClient';

export interface CategoryInput {
    name: string;
    description?: string;
    parent_id?: string | null;
    image?: File | null;
    is_active?: boolean;
    sort_order?: number;
    meta_title?: string;
    meta_description?: string;
}

export interface Category {
    id: string;
    name: string;
    slug?: string;
    parent_id?: string | null;
    parentId?: string | null;
    image?: string;
    description?: string;
    is_active?: boolean;
    isActive?: boolean;
    sort_order?: number;
    sortOrder?: number;
    meta_title?: string;
    metaTitle?: string;
    meta_description?: string;
    metaDescription?: string;
    created_at?: string;
    createdAt?: string;
    updated_at?: string;
    updatedAt?: string;
    deleted_at?: string;
    deletedAt?: string;
    parent?: Category;
    children?: Category[];
}

export interface CategoriesPaginatedResponse {
    data: Category[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

const categoryFields = `
    id
    name
    slug
    parent_id
    image
`;

const categoryFieldsFull = `
    id
    name
    slug
    description
    parentId
    image
    isActive
    sortOrder
    metaTitle
    metaDescription
    createdAt
    updatedAt
    deletedAt
    parent {
        id
        name
        slug
    }
    children {
        id
        name
        slug
    }
`;

export const categoriesGql = {
    // Gateway GraphQL queries (NestJS)
    getAll: async (options?: { 
        page?: number; 
        limit?: number; 
        search?: string; 
        parentId?: string | null;
        isActive?: boolean;
    }): Promise<CategoriesPaginatedResponse> => {
        const query = `
            query GetCategories($filter: CategoriesFilterInput) {
                categories(filter: $filter) {
                    data { ${categoryFieldsFull} }
                    total
                    page
                    limit
                    totalPages
                }
            }
        `;
        const filter = {
            page: options?.page ?? 1,
            limit: options?.limit ?? 10,
            search: options?.search,
            parentId: options?.parentId,
            isActive: options?.isActive,
        };
        const data = await gatewayGraphQLRequest<{ categories: CategoriesPaginatedResponse }>(query, { filter });
        // Normalize response to use snake_case for frontend consistency
        return {
            ...data.categories,
            data: data.categories.data.map(cat => ({
                ...cat,
                parent_id: cat.parentId,
                is_active: cat.isActive,
                sort_order: cat.sortOrder,
                meta_title: cat.metaTitle,
                meta_description: cat.metaDescription,
                created_at: cat.createdAt,
                updated_at: cat.updatedAt,
                deleted_at: cat.deletedAt,
            })),
        };
    },

    getById: async (id: string): Promise<Category> => {
        const query = `
            query GetCategory($id: ID!) {
                category(id: $id) { ${categoryFieldsFull} }
            }
        `;
        const data = await gatewayGraphQLRequest<{ category: Category }>(query, { id });
        const cat = data.category;
        return {
            ...cat,
            parent_id: cat.parentId,
            is_active: cat.isActive,
            sort_order: cat.sortOrder,
            meta_title: cat.metaTitle,
            meta_description: cat.metaDescription,
            created_at: cat.createdAt,
            updated_at: cat.updatedAt,
            deleted_at: cat.deletedAt,
        };
    },

    // Admin service GraphQL mutations (Laravel)
    create: async (input: any): Promise<Category> => {
        const query = `
            mutation CreateCategory($input: CreateCategoryInput!) {
                createCategory(input: $input) { ${categoryFields} }
            }
        `;
        const data = await adminGraphQLRequest<{ createCategory: Category }>(query, { input });
        return data.createCategory;
    },

    update: async (id: string, input: any): Promise<Category> => {
        const query = `
            mutation UpdateCategory($id: ID!, $input: UpdateCategoryInput!) {
                updateCategory(id: $id, input: $input) { ${categoryFields} }
            }
        `;
        const data = await adminGraphQLRequest<{ updateCategory: Category }>(query, { id, input });
        return data.updateCategory;
    },

    delete: async (id: string): Promise<void> => {
        const query = `
            mutation DeleteCategory($id: ID!) {
                deleteCategory(id: $id) { message }
            }
        `;
        await adminGraphQLRequest(query, { id });
    },

    restore: async (id: string): Promise<void> => {
        const query = `
            mutation RestoreCategory($id: ID!) {
                restoreCategory(id: $id) { message }
            }
        `;
        await adminGraphQLRequest(query, { id });
    },
};


