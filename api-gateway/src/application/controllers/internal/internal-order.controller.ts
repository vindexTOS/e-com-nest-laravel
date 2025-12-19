import { Controller, Post, Body, Headers } from '@nestjs/common';
import { OrdersService } from '../../../infrastructure/services/orders/orders.service';
import { Public } from '../../../infrastructure/libs/decorators/public.decorator';
import { ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';

@Controller('internal/orders')
export class InternalOrderController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Post('sync')
  @ApiOperation({ summary: 'Internal endpoint: Sync order from Laravel (write service)' })
  @ApiHeader({ name: 'X-API-Key', description: 'Service API Key' })
  @ApiResponse({ status: 201, description: 'Order synced successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API Key' })
  async syncOrder(
    @Body() orderData: any,
    @Headers('x-api-key') apiKey?: string,
  ) {
    const expectedApiKey = 'ecom-service-api-key-2024';
    if (apiKey !== expectedApiKey) {
      throw new Error('Unauthorized - Invalid API Key');
    }

    return this.ordersService.syncOrder(orderData);
  }
}

