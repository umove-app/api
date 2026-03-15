import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsDateString, ValidateIf } from 'class-validator';
import { DiscountType } from '../../../common/enums';

export class CreatePromoDto {
  @ApiProperty({ example: 'SUMMER2024' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ example: 'Summer Sale' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENTAGE })
  @IsEnum(DiscountType)
  @IsNotEmpty()
  discountType: DiscountType;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @IsNotEmpty()
  discountValue: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  minOrderValue?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  maxDiscount?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  maxUsageCount?: number;

  @ApiPropertyOptional({ example: 1 })
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

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

