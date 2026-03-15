import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class AcceptOrderDto {
  @ApiPropertyOptional({ example: 'I will be there in 10 minutes' })
  @IsString()
  @IsOptional()
  message?: string;
}
