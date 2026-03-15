import { IsEnum, IsOptional, IsString, IsNumber, IsUUID, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmergencyType } from '../../../entities/emergency.entity';

export class CreateEmergencyDto {
    @ApiProperty({ enum: EmergencyType, example: EmergencyType.ACCIDENT })
    @IsEnum(EmergencyType)
    type: EmergencyType;

    @ApiPropertyOptional({ example: 'Vehicle involved in accident on the highway' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: 6.5244 })
    @IsOptional()
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude?: number;

    @ApiPropertyOptional({ example: 3.3792 })
    @IsOptional()
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude?: number;

    @ApiPropertyOptional({ example: '123 Main Street, Lagos' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    @IsOptional()
    @IsUUID()
    orderId?: string;

    @ApiPropertyOptional({ example: 'android' })
    @IsOptional()
    @IsString()
    platform?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
