import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class InitiatePaymentDto {
  @ApiProperty({ example: 'uuid-of-order' })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ example: 'http://localhost:3001/payment/callback', required: false })
  @IsString()
  callbackUrl?: string;
}
