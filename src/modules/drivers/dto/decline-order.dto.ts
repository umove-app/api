import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class DeclineOrderDto {
  @ApiProperty({ example: 'Too far from pickup location' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
