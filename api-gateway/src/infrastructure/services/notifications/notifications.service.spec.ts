import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Notification } from '../../../domain/entities/notification.entity';
import { of } from 'rxjs';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let httpService: jest.Mocked<HttpService>;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockNotificationRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
    count: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(() => 'http://admin-service:8000/graphql'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    httpService = module.get(HttpService);
    jest.clearAllMocks();
  });

  describe('findAllForAdmins', () => {
    it('should return notifications for admins', async () => {
      const mockNotifications = [
        { id: '1', title: 'Notification 1', userId: null },
        { id: '2', title: 'Notification 2', userId: null },
      ];

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockNotifications, 2]);
      mockNotificationRepository.count.mockResolvedValue(1);

      const result = await service.findAllForAdmins({ limit: 10, offset: 0 });

      expect(result.data).toEqual(mockNotifications);
      expect(result.total).toBe(2);
      expect(result.unreadCount).toBe(1);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read using HttpService', async () => {
      const mockNotification = {
        id: '1',
        title: 'Test',
        readAt: null,
      };

      mockNotificationRepository.findOne
        .mockResolvedValueOnce(mockNotification as any)
        .mockResolvedValueOnce({ ...mockNotification, readAt: new Date() } as any);

      mockHttpService.post.mockReturnValue(
        of({
          data: {
            data: {
              markNotificationAsRead: {
                id: '1',
                read_at: new Date().toISOString(),
              },
            },
          },
        }),
      );

      const result = await service.markAsRead('1');

      expect(result).toBeDefined();
      expect(httpService.post).toHaveBeenCalled();
    });

    it('should throw NotFoundException if notification not found', async () => {
      mockNotificationRepository.findOne.mockResolvedValue(null);

      await expect(service.markAsRead('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockNotificationRepository.count.mockResolvedValue(5);

      const result = await service.getUnreadCount();

      expect(result).toBe(5);
    });
  });
});
