import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

export class InitiatePaymentDto {
  @ApiProperty({ example: 'uuid-of-order' })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @ApiPropertyOptional({ example: 'http://localhost:3001/payment/callback' })
  @IsString()
  @IsOptional()
  callbackUrl?: string;
}
