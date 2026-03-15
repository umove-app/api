import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('tracking')
@Controller('tracking')
@ApiBearerAuth()
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('orders/:id/location')
  @ApiOperation({ summary: 'Update driver location during trip (Driver only)' })
  @ApiResponse({ status: 200, description: 'Location updated successfully' })
  async updateDriverLocation(
    @CurrentUser() user: any,
    @Param('id') orderId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.trackingService.updateDriverLocation(user.id, orderId, dto);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get real-time tracking data for an order' })
  @ApiResponse({ status: 200, description: 'Returns tracking data with route and current location' })
  async getOrderTracking(@CurrentUser() user: any, @Param('id') orderId: string) {
    return this.trackingService.getOrderTracking(orderId, user.id);
  }

  @Get('orders/:id/events')
  @ApiOperation({ summary: 'Get order timeline events' })
  @ApiResponse({ status: 200, description: 'Returns chronological list of order events' })
  async getOrderEvents(@CurrentUser() user: any, @Param('id') orderId: string) {
    return this.trackingService.getOrderEvents(orderId, user.id);
  }
}
