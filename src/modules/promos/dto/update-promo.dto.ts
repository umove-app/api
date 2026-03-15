import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsDateString, ValidateIf } from 'class-validator';
import { DiscountType } from '../../../common/enums';

export class UpdatePromoDto {
  @ApiPropertyOptional({ example: 'Updated Summer Sale' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: DiscountType, example: DiscountType.PERCENTAGE })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsNumber()
  discountValue?: number;

  @ApiPropertyOptional({ example: 600 })
  @IsOptional()
  @IsNumber()
  minOrderValue?: number;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @IsNumber()
  maxDiscount?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsNumber()
  maxUsageCount?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  maxUsagePerUser?: number;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00Z' })
  @ValidateIf((o) => o.startDate !== undefined && o.startDate !== null && o.startDate !== '')
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59Z' })
  @ValidateIf((o) => o.expiresAt !== undefined && o.expiresAt !== null && o.expiresAt !== '')
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

