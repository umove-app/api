import { IsString, IsNumber, IsOptional, IsArray, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVehicleDto {
    @ApiProperty({ example: 'Sedan', description: 'Vehicle type' })
    @IsString()
    type: string;

    @ApiProperty({ example: 'Toyota', description: 'Vehicle make/brand' })
    @IsString()
    make: string;

    @ApiProperty({ example: 'Camry', description: 'Vehicle model' })
    @IsString()
    model: string;

    @ApiProperty({ example: 2022, description: 'Year of manufacture' })
    @IsNumber()
    @Min(1990)
    @Max(2030)
    year: number;

    @ApiProperty({ example: 'Black', description: 'Vehicle color' })
    @IsString()
    color: string;

    @ApiProperty({ example: 'LAG-123-XYZ', description: 'Vehicle plate number' })
    @IsString()
    plateNumber: string;

    @ApiPropertyOptional({ example: 500, description: 'Cargo capacity' })
    @IsOptional()
    @IsNumber()
    capacity?: number;

    @ApiPropertyOptional({ example: 'kg', description: 'Capacity unit' })
    @IsOptional()
    @IsString()
    capacityUnit?: string;

    @ApiPropertyOptional({ description: 'Array of base64 encoded vehicle photos' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    photos?: string[];

    @ApiPropertyOptional({ description: 'Base64 encoded registration document' })
    @IsOptional()
    @IsString()
    registrationDocument?: string;

    @ApiPropertyOptional({ description: 'Base64 encoded insurance document' })
    @IsOptional()
    @IsString()
    insuranceDocument?: string;

    @ApiPropertyOptional({ example: '2026-12-31' })
    @IsOptional()
    @IsString()
    insuranceExpiryDate?: string;

    @ApiPropertyOptional({ description: 'Base64 encoded roadworthiness certificate' })
    @IsOptional()
    @IsString()
    roadworthinessDocument?: string;

    @ApiPropertyOptional({ example: '2026-12-31' })
    @IsOptional()
    @IsString()
    roadworthinessExpiryDate?: string;
}
