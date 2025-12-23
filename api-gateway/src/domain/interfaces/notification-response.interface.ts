import { Notification } from '../entities/notification.entity';

export interface INotificationsListResponse {
  data: Notification[];
  total: number;
  unreadCount: number;
}

export interface INotificationsPaginatedResponse {
  data: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IUnreadCountResponse {
  unreadCount: number;
}

export interface IMarkAsReadResponse {
  message: string;
  notification: Notification;
}
