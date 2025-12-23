import { Notification } from '../../entities/notification.entity';
import { INotificationsListResponse } from '../notification-response.interface';

export interface INotificationsService {
  findAllForAdmins(options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }): Promise<INotificationsListResponse>;
  markAsRead(id: string): Promise<Notification>;
  markAllAsRead(): Promise<{ message: string; count: number }>;
  getUnreadCount(): Promise<number>;
  syncNotification(notificationData: any): Promise<Notification>;
}

