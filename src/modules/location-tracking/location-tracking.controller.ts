import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LocationTrackingService, TrackLocationDto, UpdateDriverLocationDto } from './location-tracking.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('location-tracking')
@Controller('location-tracking')
@ApiBearerAuth()
export class LocationTrackingController {
  constructor(private readonly locationTrackingService: LocationTrackingService) {}

  @Post('track')
  @ApiOperation({ summary: 'Track driver location during active order' })
  @ApiResponse({ status: 201, description: 'Location tracked successfully' })
  async trackLocation(@CurrentUser() user: any, @Body() dto: TrackLocationDto) {
    return this.locationTrackingService.trackLocation(user.id, dto);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get all location points for an order' })
  @ApiResponse({ status: 200, description: 'Returns location history' })
  async getOrderLocations(@CurrentUser() user: any, @Param('orderId') orderId: string) {
    return this.locationTrackingService.getOrderLocations(orderId, user.id);
  }

  @Post('driver/update')
  @ApiOperation({ summary: 'Update driver current location' })
  @ApiResponse({ status: 200, description: 'Driver location updated' })
  async updateDriverLocation(@CurrentUser() user: any, @Body() dto: UpdateDriverLocationDto) {
    return this.locationTrackingService.updateDriverLocation(user.id, dto);
  }

  @Get('driver/current')
  @ApiOperation({ summary: 'Get driver current location' })
  @ApiResponse({ status: 200, description: 'Returns current location' })
  async getDriverCurrentLocation(@CurrentUser() user: any) {
    return this.locationTrackingService.getDriverCurrentLocation(user.id);
  }
}

// Admin Location Tracking Endpoints
@ApiTags('admin/location-tracking')
@Controller('admin/location-tracking')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.ADMIN_SUPERVISOR, UserRole.SUPER_ADMIN)
export class AdminLocationTrackingController {
  constructor(private readonly locationTrackingService: LocationTrackingService) {}

  @Get('drivers/all')
  @ApiOperation({ summary: 'Get all drivers with their current locations (Admin)' })
  @ApiResponse({ status: 200, description: 'Returns all drivers with locations' })
  async getAllDriverLocations() {
    return this.locationTrackingService.getAllDriverLocations();
  }

  @Get('drivers/:driverId')
  @ApiOperation({ summary: 'Get specific driver current location (Admin)' })
  @ApiResponse({ status: 200, description: 'Returns driver location' })
  async getDriverLocation(@Param('driverId') driverId: string) {
    return this.locationTrackingService.getDriverCurrentLocation(driverId);
  }

  @Get('drivers/:driverId/history')
  @ApiOperation({ summary: 'Get driver location history (Admin)' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns driver location history' })
  async getDriverLocationHistory(
    @Param('driverId') driverId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
  ) {
    return this.locationTrackingService.getDriverLocationHistory(
      driverId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      limit,
    );
  }

  @Get('orders/:orderId')
  @ApiOperation({ summary: 'Get order location trail (Admin)' })
  @ApiResponse({ status: 200, description: 'Returns order location trail' })
  async getOrderLocationTrailAdmin(@Param('orderId') orderId: string) {
    return this.locationTrackingService.getOrderLocationTrailAdmin(orderId);
  }
}
