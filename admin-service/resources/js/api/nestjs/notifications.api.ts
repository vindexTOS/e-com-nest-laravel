import nestjsClient from './client';

export interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    data: any;
    read_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface NotificationsResponse {
    data: Notification[];
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const nestjsNotificationsApi = {
    getAll: async (page: number = 1, limit: number = 10, unreadOnly: boolean = false): Promise<NotificationsResponse> => {
        const response = await nestjsClient.get<NotificationsResponse>('/notifications', {
            params: { page, limit, unread_only: unreadOnly },
        });
        return response.data;
    },

    getUnreadCount: async (): Promise<number> => {
        const response = await nestjsClient.get<{ unreadCount: number }>('/notifications/unread-count');
        return response.data.unreadCount;
    },

    markAsRead: async (id: string): Promise<Notification> => {
        const response = await nestjsClient.post<{ message: string; notification: Notification }>(`/notifications/${id}/read`);
        return response.data.notification;
    },

    markAllAsRead: async (): Promise<void> => {
        await nestjsClient.post('/notifications/mark-all-read');
    },
};

