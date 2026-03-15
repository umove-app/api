import { IsString, IsNumber, IsArray, IsBoolean, MinLength, Min, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVehicleTypeDto {
  @ApiPropertyOptional({ example: 'Standard Delivery Van' })
  @IsString()
  @MinLength(3)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Perfect for standard deliveries up to 50kg' })
  @IsString()
  @MinLength(10)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({ example: 5000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  basePrice?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  pricePerKm?: number;

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
