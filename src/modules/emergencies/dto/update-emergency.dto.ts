import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmergencyStatus } from '../../../entities/emergency.entity';

export class UpdateEmergencyDto {
    @ApiPropertyOptional({ enum: EmergencyStatus })
    @IsOptional()
    @IsEnum(EmergencyStatus)
    status?: EmergencyStatus;

    @ApiPropertyOptional({ example: 'Admin response notes here...' })
    @IsOptional()
    @IsString()
    adminNotes?: string;
}
