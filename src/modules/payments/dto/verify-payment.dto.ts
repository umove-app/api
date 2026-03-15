import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyPaymentDto {
  @ApiProperty({ example: 'pay_xyz123' })
  @IsString()
  @IsNotEmpty()
  reference: string;
}
