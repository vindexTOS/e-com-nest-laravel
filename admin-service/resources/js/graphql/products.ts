import { graphQLRequest } from './client';

export interface ProductInput {
    name: string;
    description?: string;
    sku: string;
    price: number;
    compare_at_price?: number;
    cost_price?: number;
    stock?: number;
    low_stock_threshold?: number;
    weight?: number;
    status?: 'draft' | 'active' | 'archived';
    is_featured?: boolean;
    meta_title?: string;
    meta_description?: string;
    category_id?: string;
    slug?: string;
    image?: File | null;
}

export interface Product {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock?: number;
    status?: string;
    image?: string;
    category_id?: string;
    deleted_at?: string;
    

}

const productFields = `
    id
    name
    sku
    price
    stock
    status
    image
    category_id
`;

export const productsGql = {
    create: async (input: ProductInput): Promise<Product> => {
        const query = `
            mutation CreateProduct($input: CreateProductInput!) {
                createProduct(input: $input) { ${productFields} }
            }
        `;
        const data = await graphQLRequest<{ createProduct: Product }>(query, { input });
        return data.createProduct;
    },

    update: async (id: string, input: Partial<ProductInput>): Promise<Product> => {
        const query = `
            mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
                updateProduct(id: $id, input: $input) { ${productFields} }
            }
        `;
        const data = await graphQLRequest<{ updateProduct: Product }>(query, { id, input });
        return data.updateProduct;
    },

    delete: async (id: string): Promise<void> => {
        const query = `
            mutation DeleteProduct($id: ID!) {
                deleteProduct(id: $id) { message }
            }
        `;
        await graphQLRequest(query, { id });
    },

    restore: async (id: string): Promise<void> => {
        const query = `
            mutation RestoreProduct($id: ID!) {
                restoreProduct(id: $id) { message }
            }
        `;
        await graphQLRequest(query, { id });
    },

    bulkDelete: async (ids: string[]): Promise<void> => {
        const query = `
            mutation BulkDelete($ids: [ID!]!) {
                bulkDeleteProducts(ids: $ids) { message }
            }
        `;
        await graphQLRequest(query, { ids });
    },

    bulkUpdate: async (ids: string[], data: Partial<ProductInput>): Promise<void> => {
        const query = `
            mutation BulkUpdate($ids: [ID!]!, $data: ProductBulkUpdateInput!) {
                bulkUpdateProducts(ids: $ids, data: $data) { message }
            }
        `;
        await graphQLRequest(query, { ids, data });
    },

    importProducts: async (file: File): Promise<void> => {
        const query = `
            mutation ImportProducts($file: Upload!) {
                importProducts(file: $file) { message }
            }
        `;
        await graphQLRequest(query, { file });
    },
};


