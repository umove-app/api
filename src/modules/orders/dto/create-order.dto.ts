import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { OrderType, OrderPaymentMode } from '../../../common/enums';

export class CreateOrderDto {
  @ApiProperty({ enum: OrderType, example: OrderType.MOVE_TRANSPORT })
  @IsEnum(OrderType)
  @IsNotEmpty()
  orderType: OrderType;

  @ApiPropertyOptional({
    enum: OrderPaymentMode,
    description:
      'PREPAID (default; required for passenger orders) or PAY_ON_DELIVERY (goods only).',
  })
  @IsEnum(OrderPaymentMode)
  @IsOptional()
  paymentMode?: OrderPaymentMode;

  @ApiProperty({ example: '123 Main Street, Lagos' })
  @IsString()
  @IsNotEmpty()
  pickupAddress: string;

  @ApiProperty({ example: 6.5244 })
  @IsNumber()
  @IsNotEmpty()
  pickupLatitude: number;

  @ApiProperty({ example: 3.3792 })
  @IsNumber()
  @IsNotEmpty()
  pickupLongitude: number;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsString()
  @IsOptional()
  pickupPhone?: string;

  @ApiPropertyOptional({ example: 'Ring the bell twice' })
  @IsString()
  @IsOptional()
  pickupNotes?: string;

  @ApiProperty({ example: '456 Oak Avenue, Ikeja' })
  @IsString()
  @IsNotEmpty()
  destinationAddress: string;

  @ApiProperty({ example: 6.6018 })
  @IsNumber()
  @IsNotEmpty()
  destinationLatitude: number;

  @ApiProperty({ example: 3.3515 })
  @IsNumber()
  @IsNotEmpty()
  destinationLongitude: number;

  @ApiPropertyOptional({ example: '+2348087654321' })
  @IsString()
  @IsOptional()
  destinationPhone?: string;

  @ApiPropertyOptional({ example: 'Leave at the gate' })
  @IsString()
  @IsOptional()
  destinationNotes?: string;

  @ApiProperty({ example: 'Sedan' })
  @IsString()
  @IsNotEmpty()
  vehicleType: string;

  @ApiPropertyOptional({ example: '2024-12-20T10:00:00Z' })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiPropertyOptional({ example: 'SAVE10' })
  @IsString()
  @IsOptional()
  promoCode?: string;

  @ApiPropertyOptional({ example: 'uuid-of-driver' })
  @IsString()
  @IsOptional()
  preferredDriverId?: string;
}
