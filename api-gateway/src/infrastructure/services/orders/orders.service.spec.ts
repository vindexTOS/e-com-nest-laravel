import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from '../../../domain/entities/order.entity';
import { OrderItem } from '../../../domain/entities/order-item.entity';
import { Product } from '../../../domain/entities/product.entity';
import { User } from '../../../domain/entities/user.entity';
import { Notification } from '../../../domain/entities/notification.entity';
import { RedisService } from '../../cache/redis.service';
import { SoketiService } from '../broadcasting/soketi.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let redisService: jest.Mocked<RedisService>;
  let soketiService: jest.Mocked<SoketiService>;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getMany: jest.fn(),
  };

  const mockOrderRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
    restore: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  const mockRedisService = {
    publish: jest.fn().mockResolvedValue(1),
  };

  const mockSoketiService = {
    broadcastAdminNotification: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Product, 'write'),
          useValue: {},
        },
        {
          provide: getRepositoryToken(User, 'write'),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Notification, 'write'),
          useValue: {},
        },
        {
          provide: getDataSourceToken('write'),
          useValue: mockDataSource,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: SoketiService,
          useValue: mockSoketiService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    redisService = module.get(RedisService);
    soketiService = module.get(SoketiService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return orders with filters', async () => {
      const mockOrders = [
        { id: '1', orderNumber: 'ORD-001', status: 'pending' },
        { id: '2', orderNumber: 'ORD-002', status: 'completed' },
      ];

      mockQueryBuilder.getCount.mockResolvedValue(2);
      mockQueryBuilder.getMany.mockResolvedValue(mockOrders as any);

      const result = await service.findAll({ userId: 'user-1', limit: 10, offset: 0 });

      expect(result.data).toEqual(mockOrders);
      expect(result.total).toBe(2);
    });

    it('should filter by status', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([{ id: '1', status: 'pending' }] as any);

      await service.findAll({ status: 'pending' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('order.status = :status', { status: 'pending' });
    });
  });

  describe('findOne', () => {
    it('should return an order by id', async () => {
      const mockOrder = {
        id: '1',
        orderNumber: 'ORD-001',
        user: { id: 'user-1' },
        items: [],
      };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder as any);

      const result = await service.findOne('1');

      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException if order not found', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createOrder', () => {
    const mockUser = {
      id: 'user-1',
      email: 'user@test.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    const mockProduct = {
      id: 'product-1',
      name: 'Test Product',
      price: 100,
      stock: 10,
    };

    const mockOrder = {
      id: 'order-1',
      orderNumber: 'ORD-1234567890-0001',
      userId: 'user-1',
      total: 110,
      items: [{ id: 'item-1', productId: 'product-1', quantity: 1 }],
      user: mockUser,
    };

    const createOrderDto = {
      userId: 'user-1',
      items: [{ productId: 'product-1', quantity: 1 }],
    };

    it('should create an order and use RedisService to publish events', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockProduct as any)
        .mockResolvedValueOnce(mockOrder as any);

      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...mockProduct, stock: 9 } as any)
        .mockResolvedValueOnce(mockOrder as any)
        .mockResolvedValueOnce({ id: 'item-1' } as any)
        .mockResolvedValueOnce({ id: 'notif-1' } as any);

      const result = await service.createOrder(createOrderDto);

      expect(result).toBeDefined();
      expect(redisService.publish).toHaveBeenCalled();
    });

    it('should use SoketiService to broadcast notification', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockProduct as any)
        .mockResolvedValueOnce(mockOrder as any);

      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ ...mockProduct, stock: 9 } as any)
        .mockResolvedValueOnce(mockOrder as any)
        .mockResolvedValueOnce({ id: 'item-1' } as any)
        .mockResolvedValueOnce({ id: 'notif-1' } as any);

      await service.createOrder(createOrderDto);

      expect(soketiService.broadcastAdminNotification).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(service.createOrder(createOrderDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if insufficient stock', async () => {
      const lowStockProduct = { ...mockProduct, stock: 0 };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(lowStockProduct as any);

      await expect(service.createOrder(createOrderDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted order', async () => {
      const mockOrder = { id: 'order-1', orderNumber: 'ORD-001' };
      mockOrderRepository.restore.mockResolvedValue({ affected: 1 } as any);
      mockOrderRepository.findOne.mockResolvedValue(mockOrder as any);

      const result = await service.restore('order-1');

      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException if order not found', async () => {
      mockOrderRepository.restore.mockResolvedValue({ affected: 0 } as any);

      await expect(service.restore('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete', () => {
    it('should soft delete an order', async () => {
      mockOrderRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.softDelete('order-1');

      expect(mockOrderRepository.softDelete).toHaveBeenCalledWith('order-1');
    });

    it('should throw NotFoundException if order not found', async () => {
      mockOrderRepository.softDelete.mockResolvedValue({ affected: 0 } as any);

      await expect(service.softDelete('invalid')).rejects.toThrow(NotFoundException);
    });
  });
});
