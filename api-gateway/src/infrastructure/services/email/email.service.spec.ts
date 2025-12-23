import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService, OrderConfirmationEmailData } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    jest.clearAllMocks();
  });

  describe('sendOrderConfirmation', () => {
    it('should log order confirmation email (mock mode)', async () => {
      const emailData: OrderConfirmationEmailData = {
        customerName: 'John Doe',
        customerEmail: 'john@test.com',
        orderNumber: 'ORD-001',
        orderDate: '2024-01-01',
        items: [
          { name: 'Product 1', quantity: 2, price: 50, total: 100 },
        ],
        subtotal: 100,
        tax: 10,
        shipping: 0,
        discount: 0,
        total: 110,
      };

      const loggerSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

      await service.sendOrderConfirmation(emailData);

      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });
});
