import { graphQLRequest } from './client';

export interface BalanceResponse {
    balance: number;
    message: string;
}

export interface AddBalanceInput {
    amount: number;
    card_number: string;
    card_expiry: string;
    card_cvv: string;
}

export const balanceGql = {
    getBalance: async (): Promise<BalanceResponse> => {
        const query = `
            mutation GetMyBalance {
                getMyBalance {
                    balance
                    message
                }
            }
        `;
        const data = await graphQLRequest<{ getMyBalance: BalanceResponse }>(query);
        return data.getMyBalance;
    },

    addBalance: async (input: AddBalanceInput): Promise<BalanceResponse> => {
        const query = `
            mutation AddBalance($input: AddBalanceInput!) {
                addBalance(input: $input) {
                    balance
                    message
                }
            }
        `;
        const data = await graphQLRequest<{ addBalance: BalanceResponse }>(query, { input });
        return data.addBalance;
    },
};

