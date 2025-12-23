import { IsNumber, IsString, Min, Max, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddBalanceDto {
  @ApiProperty({ description: 'Amount to add to balance', minimum: 1, maximum: 10000 })
  @IsNumber()
  @Min(1, { message: 'Amount must be at least $1' })
  @Max(10000, { message: 'Maximum deposit is $10,000' })
  amount: number;

  @ApiProperty({ description: 'Credit card number' })
  @IsString()
  @Matches(/^\d{13,19}$/, { message: 'Card number must be 13-19 digits' })
  cardNumber: string;

  @ApiProperty({ description: 'Card expiry (MM/YY)' })
  @IsString()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, { message: 'Expiry must be in MM/YY format' })
  cardExpiry: string;

  @ApiProperty({ description: 'Card CVV' })
  @IsString()
  @Matches(/^\d{3,4}$/, { message: 'CVV must be 3-4 digits' })
  cardCvv: string;
}

