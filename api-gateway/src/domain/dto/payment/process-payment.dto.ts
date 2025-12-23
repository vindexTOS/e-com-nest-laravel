import { IsString, IsNumber, IsOptional, Min, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProcessPaymentDto {
  @ApiProperty({ description: 'Order ID to process payment for' })
  @IsString()
  orderId: string;

  @ApiPropertyOptional({ description: 'Payment method: wallet_balance or credit_card' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Credit card number (if using credit card)' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{13,19}$/, { message: 'Card number must be 13-19 digits' })
  cardNumber?: string;

  @ApiPropertyOptional({ description: 'Card expiry (MM/YY)' })
  @IsString()
  @IsOptional()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, { message: 'Expiry must be in MM/YY format' })
  cardExpiry?: string;

  @ApiPropertyOptional({ description: 'Card CVV' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{3,4}$/, { message: 'CVV must be 3-4 digits' })
  cardCvv?: string;

  @ApiPropertyOptional({ description: 'Cardholder name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  cardholderName?: string;
}

