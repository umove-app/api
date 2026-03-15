import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetVehicleTypesDto {
  @ApiPropertyOptional({ example: 'Nigeria' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  activeOnly?: boolean;
}
