import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { UsersService } from '../services/users/users.service';
import { OrdersService } from '../services/orders/orders.service';
import { NotificationsService } from '../services/notifications/notifications.service';
import { NotificationEventsService } from '../services/notifications/notification-events.service';
import { JwtWsGuard } from '../libs/guards/jwt-ws.guard';
import { CurrentUserWs } from '../libs/decorators/current-user-ws.decorator';

@WebSocketGateway({
  namespace: '/ws',
  path: '/socket.io',
  cors: {
    origin: '*',
  },
})
export class UsersGateway implements OnGatewayConnection {
  constructor(
    private readonly usersService: UsersService,
    private readonly ordersService: OrdersService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationEventsService: NotificationEventsService,
  ) {
    this.notificationEventsService.setBroadcastCallback((notification) => {
      this.broadcastNotification(notification);
    });
  }

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    await this.emitUsers(client, {});
  }

  @SubscribeMessage('users:get')
  async handleUsersGet(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      search?: string;
      role?: string;
      page?: number;
      limit?: number;
      withDeleted?: boolean;
    } = {},
  ) {
    const { search, role, page = 1, limit = 50, withDeleted } = payload;
    const offset = (page - 1) * limit;
    await this.emitUsers(client, { search, role, limit, offset, withDeleted });
  }

  @SubscribeMessage('users:restore')
  async handleUserRestore(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { id: string },
  ) {
    try {
      const user = await this.usersService.restore(payload.id);
      client.emit('users:restored', { success: true, data: user });
    } catch (error: any) {
      client.emit('users:restored', { success: false, error: error.message });
    }
  }

  private async emitUsers(
    client: Socket,
    options: {
      search?: string;
      role?: string;
      limit?: number;
      offset?: number;
      withDeleted?: boolean;
    },
  ) {
    const result = await this.usersService.findAll(options);
    client.emit('users:list', result);
  }

  @SubscribeMessage('orders:get')
  async handleOrdersGet(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      userId?: string;
      status?: string;
      fulfillmentStatus?: string;
      orderNumber?: string;
      page?: number;
      limit?: number;
      withDeleted?: boolean;
    } = {},
  ) {
    const {
      userId,
      status,
      fulfillmentStatus,
      orderNumber,
      page = 1,
      limit = 50,
      withDeleted,
    } = payload;
    const offset = (page - 1) * limit;
    await this.emitOrders(client, {
      userId,
      status,
      fulfillmentStatus,
      orderNumber,
      limit,
      offset,
      withDeleted,
    });
  }

  @SubscribeMessage('orders:getOne')
  async handleOrderGetOne(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { id: string },
  ) {
    try {
      const order = await this.ordersService.findOne(payload.id);
      client.emit('orders:one', { success: true, data: order });
    } catch (error: any) {
      client.emit('orders:one', { success: false, error: error.message });
    }
  }

  @SubscribeMessage('orders:restore')
  async handleOrderRestore(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { id: string },
  ) {
    try {
      const order = await this.ordersService.restore(payload.id);
      client.emit('orders:restored', { success: true, data: order });
    } catch (error: any) {
      client.emit('orders:restored', { success: false, error: error.message });
    }
  }

  @UseGuards(JwtWsGuard)
  @SubscribeMessage('orders:getMyOrders')
  async handleMyOrders(
    @ConnectedSocket() client: Socket,
    @CurrentUserWs() user: { id: string; email: string; role: string },
    @MessageBody()
    payload: {
      status?: string;
      fulfillmentStatus?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { status, fulfillmentStatus, page = 1, limit = 50 } = payload;
    const offset = (page - 1) * limit;
    await this.emitOrders(
      client,
      { userId: user.id, status, fulfillmentStatus, limit, offset },
      'orders:myList',
    );
  }

  private async emitOrders(
    client: Socket,
    options: {
      userId?: string;
      status?: string;
      fulfillmentStatus?: string;
      orderNumber?: string;
      limit?: number;
      offset?: number;
      withDeleted?: boolean;
    },
    event = 'orders:list',
  ) {
    try {
      const result = await this.ordersService.findAll(options);
      client.emit(event, { success: true, ...result });
    } catch (error: any) {
      client.emit(event, {
        success: false,
        error: error.message,
        data: [],
        total: 0,
      });
    }
  }

  broadcastOrderUpdate(order: any) {
    this.server.emit('orders:updated', order);
  }

  @SubscribeMessage('notifications:get')
  async handleNotificationsGet(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
    } = {},
  ) {
    const { page = 1, limit = 50, unreadOnly = false } = payload;
    const offset = (page - 1) * limit;
    try {
      const result = await this.notificationsService.findAllForAdmins({
        limit,
        offset,
        unreadOnly,
      });
      client.emit('notifications:list', { success: true, ...result });
    } catch (error: any) {
      client.emit('notifications:list', {
        success: false,
        error: error.message,
        data: [],
        total: 0,
        unreadCount: 0,
      });
    }
  }

  @SubscribeMessage('notifications:getUnreadCount')
  async handleNotificationsUnreadCount(@ConnectedSocket() client: Socket) {
    try {
      const unreadCount = await this.notificationsService.getUnreadCount();
      client.emit('notifications:unreadCount', { success: true, unreadCount });
    } catch (error: any) {
      client.emit('notifications:unreadCount', {
        success: false,
        error: error.message,
        unreadCount: 0,
      });
    }
  }

  @SubscribeMessage('notifications:markRead')
  async handleNotificationMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { id: string },
  ) {
    try {
      await this.notificationsService.markAsRead(payload.id);
      const unreadCount = await this.notificationsService.getUnreadCount();
      client.emit('notifications:markedRead', {
        success: true,
        id: payload.id,
        unreadCount,
      });
    } catch (error: any) {
      client.emit('notifications:markedRead', {
        success: false,
        error: error.message,
      });
    }
  }

  @SubscribeMessage('notifications:markAllRead')
  async handleNotificationMarkAllRead(@ConnectedSocket() client: Socket) {
    try {
      const result = await this.notificationsService.markAllAsRead();
      client.emit('notifications:allMarkedRead', {
        success: true,
        ...result,
        unreadCount: 0,
      });
    } catch (error: any) {
      client.emit('notifications:allMarkedRead', {
        success: false,
        error: error.message,
      });
    }
  }

  broadcastNotification(notification: any) {
    this.server.emit('notifications:new', notification);
  }
}
