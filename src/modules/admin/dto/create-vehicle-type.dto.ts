import { IsString, IsNumber, IsArray, IsBoolean, MinLength, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVehicleTypeDto {
  @ApiProperty({ example: 'Standard Delivery Van' })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty({ example: 'Perfect for standard deliveries up to 50kg' })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(1)
  capacity: number;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  pricePerKm: number;

  @ApiPropertyOptional({ example: ['Nigeria', 'Ghana'] })
  @IsArray()
  @IsOptional()
  availableCountries?: string[];

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
