import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Inject } from '@nestjs/common';
import type { IPaymentService } from '../../../domain/interfaces/services';
import { JwtAuthGuard } from '../../../infrastructure/libs/guards/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/libs/guards/roles.guard';
import { Roles } from '../../../infrastructure/libs/decorators/roles.decorator';
import { CurrentUser } from '../../../infrastructure/libs/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../../infrastructure/libs/decorators/current-user.decorator';
import { UserRole } from '../../../domain/entities/user.entity';
import { ProcessPaymentDto } from '../../../domain/dto/payment/process-payment.dto';
import { AddBalanceDto } from '../../../domain/dto/payment/add-balance.dto';
import {
  IBalanceResponse,
  IProcessPaymentResponse,
} from '../../../domain/interfaces';

@ApiTags('Payment')
@Controller('payment')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PaymentController {
  constructor(
    @Inject('IPaymentService')
    private readonly paymentService: IPaymentService,
  ) {}

  @Post('add-balance')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add balance to user account' })
  @ApiResponse({ status: 200, description: 'Balance added successfully' })
  async addBalance(
    @Body() addBalanceDto: AddBalanceDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<IBalanceResponse> {
    return this.paymentService.addBalance(user.id, addBalanceDto);
  }

  @Get('balance')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get current user balance' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  async getBalance(@CurrentUser() user: CurrentUserPayload): Promise<IBalanceResponse> {
    return this.paymentService.getBalance(user.id);
  }

  @Post('process')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process payment for an order' })
  @ApiResponse({ status: 200, description: 'Payment processed successfully' })
  async processPayment(
    @Body() processPaymentDto: ProcessPaymentDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<IProcessPaymentResponse> {
    return this.paymentService.processPayment(user.id, processPaymentDto);
  }
}
