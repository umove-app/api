import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class UpdateLocationDto {
  @ApiProperty({ example: 6.5244 })
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({ example: 3.3792 })
  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @ApiPropertyOptional({ example: 45.5 })
  @IsNumber()
  @IsOptional()
  speed?: number;

  @ApiPropertyOptional({ example: 270 })
  @IsNumber()
  @IsOptional()
  heading?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  accuracy?: number;
}
