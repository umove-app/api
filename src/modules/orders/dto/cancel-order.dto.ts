import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CancelOrderDto {
  @ApiProperty({ example: 'Customer changed plans' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
