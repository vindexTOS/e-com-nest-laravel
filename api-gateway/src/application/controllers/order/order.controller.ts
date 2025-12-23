import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from '../../../infrastructure/services/orders/orders.service';
import type { CreateOrderDto } from '../../../infrastructure/services/orders/orders.service';
import { JwtAuthGuard } from '../../../infrastructure/libs/guards/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/libs/guards/roles.guard';
import { Roles } from '../../../infrastructure/libs/decorators/roles.decorator';
import { UserRole } from '../../../domain/entities/user.entity';
import { CurrentUser } from '../../../infrastructure/libs/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../../infrastructure/libs/decorators/current-user.decorator';
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
  @Get('my-orders')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user orders' })
  @ApiResponse({ status: 200, description: 'List of user orders' })
  async getMyOrders(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('fulfillment_status') fulfillmentStatus?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.ordersService.findAll({
      userId: user.id,
      status,
      fulfillmentStatus,
      limit: limit ? parseInt(limit.toString(), 10) : undefined,
      offset: offset ? parseInt(offset.toString(), 10) : undefined,
    });
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or insufficient stock',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    // If customer, use their user ID (admins can specify userId)
    if (user.role === UserRole.CUSTOMER) {
      createOrderDto.userId = user.id;
    }
    return this.ordersService.createOrder(createOrderDto);
  }
}
