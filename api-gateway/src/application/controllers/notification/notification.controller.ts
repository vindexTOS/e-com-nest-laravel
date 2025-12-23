import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { INotificationsService } from '../../../domain/interfaces/services';
import { JwtAuthGuard } from '../../../infrastructure/libs/guards/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/libs/guards/roles.guard';
import { Roles } from '../../../infrastructure/libs/decorators/roles.decorator';
import { UserRole } from '../../../domain/entities/user.entity';
import {
  INotificationsPaginatedResponse,
  IUnreadCountResponse,
  IMarkAsReadResponse,
} from '../../../domain/interfaces';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationController {
  constructor(
    @Inject('INotificationsService')
    private readonly notificationsService: INotificationsService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('unread_only') unreadOnly?: string,
  ): Promise<INotificationsPaginatedResponse> {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const pageNum = page ? parseInt(page, 10) : 1;
    const offset = (pageNum - 1) * limitNum;

    const result = await this.notificationsService.findAllForAdmins({
      limit: limitNum,
      offset,
      unreadOnly: unreadOnly === 'true',
    });

    return {
      data: result.data,
      total: result.total,
      unreadCount: result.unreadCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(result.total / limitNum),
    };
  }

  @Get('unread-count')
  @Roles(UserRole.ADMIN)
  async getUnreadCount(): Promise<IUnreadCountResponse> {
    const count = await this.notificationsService.getUnreadCount();
    return { unreadCount: count };
  }

  @Post(':id/read')
  @Roles(UserRole.ADMIN)
  async markAsRead(@Param('id') id: string): Promise<IMarkAsReadResponse> {
    const notification = await this.notificationsService.markAsRead(id);
    return { message: 'Notification marked as read', notification };
  }

  @Post('mark-all-read')
  @Roles(UserRole.ADMIN)
  async markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }
}
