import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from '../../../domain/entities/order.entity';
import { OrderItem } from '../../../domain/entities/order-item.entity';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: jest.Mocked<Repository<Order>>;
  let orderItemRepository: jest.Mocked<Repository<OrderItem>>;

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
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockOrderItemRepository = {
    delete: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
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
          useValue: mockOrderItemRepository,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get(getRepositoryToken(Order));
    orderItemRepository = module.get(getRepositoryToken(OrderItem));

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
      expect(mockOrderRepository.createQueryBuilder).toHaveBeenCalled();
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
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['user', 'items', 'items.product'],
      });
    });

    it('should throw NotFoundException if order not found', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid')).rejects.toThrow(NotFoundException);
    });
  });
});

