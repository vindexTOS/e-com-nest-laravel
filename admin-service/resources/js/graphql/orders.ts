import { graphQLRequest } from './client';
import { Order } from '../types';

export const ordersGql = {
    create: async (input: any): Promise<any> => {
        const query = `
            mutation CreateOrder($input: CreateOrderInput!) {
                createOrder(input: $input) {
                    id
                    order_number
                    status
                    total
                    created_at
                    items {
                        id
                        product_id
                        product_name
                        quantity
                        total_price
                    }
                }
            }
        `;
        const data = await graphQLRequest<{ createOrder: any }>(query, { input });
        return data.createOrder;
    },

    myOrders: async (status?: string): Promise<any[]> => {
        const query = `
            query MyOrders($status: String) {
                myOrders(status: $status) {
                    id
                    order_number
                    status
                    total
                    created_at
                    items {
                        id
                        product_name
                        quantity
                        total_price
                    }
                }
            }
        `;
        const data = await graphQLRequest<{ myOrders: any[] }>(query, { status });
        return data.myOrders;
    },

    update: async (id: string, input: Partial<Order>): Promise<void> => {
        const query = `
            mutation UpdateOrder($id: ID!, $input: UpdateOrderInput!) {
                updateOrder(id: $id, input: $input) { id }
            }
        `;
        await graphQLRequest(query, { id, input });
    },

    delete: async (id: string): Promise<void> => {
        const query = `
            mutation DeleteOrder($id: ID!) {
                deleteOrder(id: $id) { message }
            }
        `;
        await graphQLRequest(query, { id });
    },

    restore: async (id: string): Promise<void> => {
        const query = `
            mutation RestoreOrder($id: ID!) {
                restoreOrder(id: $id) { message }
            }
        `;
        await graphQLRequest(query, { id });
    },

    fulfill: async (id: string): Promise<void> => {
        const query = `
            mutation FulfillOrder($id: ID!) {
                fulfillOrder(id: $id) { id }
            }
        `;
        await graphQLRequest(query, { id });
    },
};


