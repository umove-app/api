import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 15 })
  @IsNumber()
  @IsOptional()
  vatPercentage?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsNumber()
  @IsOptional()
  minimumFare?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  cancellationFeePercentage?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @IsOptional()
  driverCommissionPercentage?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  maxSearchRadiusKm?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @IsOptional()
  driverAcceptanceTimeoutMinutes?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  autoAssignDriver?: boolean;

  @ApiPropertyOptional({ example: 'support@umove.com' })
  @IsString()
  @IsOptional()
  supportEmail?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsString()
  @IsOptional()
  supportPhone?: string;

  @ApiPropertyOptional({ example: '123 Main St, Lagos, Nigeria' })
  @IsString()
  @IsOptional()
  supportAddress?: string;

  @ApiPropertyOptional({ example: 'UMove Logistics' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ example: '123 Main St, Lagos' })
  @IsString()
  @IsOptional()
  companyAddress?: string;
}
