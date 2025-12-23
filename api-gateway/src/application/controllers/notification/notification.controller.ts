import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from '../../../infrastructure/services/notifications/notifications.service';
import { JwtAuthGuard } from '../../../infrastructure/libs/guards/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/libs/guards/roles.guard';
import { Roles } from '../../../infrastructure/libs/decorators/roles.decorator';
import { UserRole } from '../../../domain/entities/user.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('unread_only') unreadOnly?: string,
  ) {
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
  async getUnreadCount() {
    const count = await this.notificationsService.getUnreadCount();
    return { unreadCount: count };
  }

  @Post(':id/read')
  @Roles(UserRole.ADMIN)
  async markAsRead(@Param('id') id: string) {
    const notification = await this.notificationsService.markAsRead(id);
    return { message: 'Notification marked as read', notification };
  }

  @Post('mark-all-read')
  @Roles(UserRole.ADMIN)
  async markAllAsRead() {
    return this.notificationsService.markAllAsRead();
  }
}
