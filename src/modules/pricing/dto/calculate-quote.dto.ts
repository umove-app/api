import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class CalculateQuoteDto {
  @ApiProperty({ example: 6.5244, description: 'Pickup latitude' })
  @IsNumber()
  @IsNotEmpty()
  pickupLatitude: number;

  @ApiProperty({ example: 3.3792, description: 'Pickup longitude' })
  @IsNumber()
  @IsNotEmpty()
  pickupLongitude: number;

  @ApiProperty({ example: 6.4281, description: 'Destination latitude' })
  @IsNumber()
  @IsNotEmpty()
  destinationLatitude: number;

  @ApiProperty({ example: 3.4219, description: 'Destination longitude' })
  @IsNumber()
  @IsNotEmpty()
  destinationLongitude: number;

  @ApiProperty({ example: 'Sedan' })
  @IsString()
  @IsNotEmpty()
  vehicleType: string;

  @ApiProperty({ example: 'Nigeria' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiPropertyOptional({ example: 'SAVE10' })
  @IsString()
  @IsOptional()
  promoCode?: string;
}
