import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';

export class GetAvailableVehiclesDto {
  @ApiProperty({ example: 6.5244, description: 'Pickup latitude' })
  @IsNumber()
  @IsNotEmpty()
  pickupLat: number;

  @ApiProperty({ example: 3.3792, description: 'Pickup longitude' })
  @IsNumber()
  @IsNotEmpty()
  pickupLng: number;

  @ApiPropertyOptional({ example: 'Sedan' })
  @IsString()
  @IsOptional()
  vehicleType?: string;

  @ApiPropertyOptional({ example: '2024-12-20T10:00:00Z' })
  @IsDateString()
  @IsOptional()
  scheduleAt?: string;

  @ApiPropertyOptional({ example: 10, description: 'Search radius in km' })
  @IsNumber()
  @IsOptional()
  radius?: number;
}
