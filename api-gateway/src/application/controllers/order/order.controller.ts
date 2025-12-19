import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from '../../../infrastructure/services/orders/orders.service';
import { JwtAuthGuard } from '../../../infrastructure/libs/guards/jwt-auth.guard';
import { ApiController } from '../../../infrastructure/libs/swagger/api-docs.decorator';
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiController('Orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all orders (read-only)' })
  @ApiResponse({ status: 200, description: 'List of orders' })
  async findAll(
    @Query('user_id') userId?: string,
    @Query('status') status?: string,
    @Query('fulfillment_status') fulfillmentStatus?: string,
    @Query('order_number') orderNumber?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const result = await this.ordersService.findAll({
      userId,
      status,
      fulfillmentStatus,
      orderNumber,
      limit: limit ? parseInt(limit.toString(), 10) : undefined,
      offset: offset ? parseInt(offset.toString(), 10) : undefined,
    });
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order by ID (read-only)' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

}

