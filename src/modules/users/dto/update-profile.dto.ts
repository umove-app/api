import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEmail, IsEnum } from 'class-validator';
import { UserRole } from '../../../common/enums';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '123 Main Street, Lagos' })
  @IsString()
  @IsOptional()
  defaultAddress?: string;

  @ApiPropertyOptional({ example: 6.5244 })
  @IsNumber()
  @IsOptional()
  defaultLatitude?: number;

  @ApiPropertyOptional({ example: 3.3792 })
  @IsNumber()
  @IsOptional()
  defaultLongitude?: number;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  @IsString()
  @IsOptional()
  profilePicture?: string;

  @ApiPropertyOptional({ example: { email: true, sms: false } })
  @IsOptional()
  notificationPreferences?: Record<string, any>;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.CUSTOMER })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
