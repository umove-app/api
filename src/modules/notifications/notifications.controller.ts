import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminRole } from '../../common/enums';

@ApiTags('notifications')
@Controller('notifications')
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications (paginated)' })
  @ApiResponse({ status: 200, description: 'Returns list of notifications' })
  async getUserNotifications(
    @CurrentUser() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.notificationsService.getUserNotifications(user.id, page, limit);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Post('send')
  @Roles(AdminRole.ADMIN, AdminRole.SUPERVISOR, AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Send notification (Admin only)' })
  @ApiResponse({ status: 200, description: 'Notification sent successfully' })
  async sendNotification(@CurrentUser() user: any, @Body() dto: SendNotificationDto) {
    return this.notificationsService.sendNotification(dto, user.id);
  }

  // Admin endpoints for notification management
  @Post('admin/send')
  @Roles(AdminRole.ADMIN, AdminRole.SUPERVISOR, AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Send notification from admin panel (Admin only)' })
  @ApiResponse({ status: 200, description: 'Notification sent successfully' })
  async adminSendNotification(@CurrentUser() user: any, @Body() dto: SendNotificationDto) {
    return this.notificationsService.sendNotification(dto, user.id);
  }

  @Get('admin')
  @Roles(AdminRole.ADMIN, AdminRole.SUPERVISOR, AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all notifications with pagination (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns list of all notifications' })
  async getAllNotifications(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.notificationsService.getAllNotifications(page, limit);
  }
}
