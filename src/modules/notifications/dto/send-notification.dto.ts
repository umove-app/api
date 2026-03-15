import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { NotificationType } from '../../../entities/notification.entity';

export class SendNotificationDto {
  @ApiPropertyOptional({ example: 'uuid-of-user' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ example: 'ALL_CUSTOMERS' })
  @IsString()
  @IsOptional()
  audienceGroup?: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.ORDER_CREATED })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({ example: 'New Order Assigned' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'You have a new order waiting for you' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.png' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ example: { orderId: 'uuid' } })
  @IsOptional()
  data?: Record<string, any>;
}
