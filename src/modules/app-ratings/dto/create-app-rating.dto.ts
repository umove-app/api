import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAppRatingDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  easeOfUse?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  features?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  performance?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  design?: number;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsString()
  deviceModel?: string;
}
