import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SoketiService } from './soketi.service';
import Pusher from 'pusher';

jest.mock('pusher');

describe('SoketiService', () => {
  let service: SoketiService;
  let mockPusherInstance: jest.Mocked<Pusher>;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        PUSHER_APP_ID: 'test-app-id',
        PUSHER_APP_KEY: 'test-key',
        PUSHER_APP_SECRET: 'test-secret',
        PUSHER_HOST: 'soketi',
        PUSHER_PORT: 6001,
        PUSHER_SCHEME: 'http',
        PUSHER_APP_CLUSTER: 'mt1',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    mockPusherInstance = {
      trigger: jest.fn().mockResolvedValue(undefined),
    } as any;

    (Pusher as jest.MockedClass<typeof Pusher>).mockImplementation(() => mockPusherInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SoketiService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SoketiService>(SoketiService);
    jest.clearAllMocks();
  });

  describe('broadcastNotification', () => {
    it('should broadcast notification to channel', async () => {
      const channel = 'test-channel';
      const event = 'test-event';
      const data = { message: 'test' };

      await service.broadcastNotification(channel, event, data);

      expect(mockPusherInstance.trigger).toHaveBeenCalledWith(channel, event, data);
    });
  });

  describe('broadcastAdminNotification', () => {
    it('should broadcast admin notification', async () => {
      const notification = {
        id: '1',
        type: 'order_created',
        title: 'New Order',
        message: 'Test message',
      };

      await service.broadcastAdminNotification(notification);

      expect(mockPusherInstance.trigger).toHaveBeenCalledWith(
        'admin-notifications',
        'new-notification',
        notification,
      );
    });
  });
});
