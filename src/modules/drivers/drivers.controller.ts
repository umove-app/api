import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { AcceptOrderDto } from './dto/accept-order.dto';
import { DeclineOrderDto } from './dto/decline-order.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, OrderStatus } from '../../common/enums';

@ApiTags('driver')
@Controller('driver')
@ApiBearerAuth()
@Roles(UserRole.DRIVER)
export class DriversController {
  constructor(private readonly driversService: DriversService) { }

  // ============= Driver Endpoints =============

  @Patch('availability')
  @ApiOperation({ summary: 'Update driver availability status' })
  @ApiResponse({ status: 200, description: 'Availability updated successfully' })
  async updateAvailability(@CurrentUser() user: any, @Body() dto: UpdateAvailabilityDto) {
    return this.driversService.updateAvailability(user.id, dto);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get all orders for driver' })
  @ApiResponse({ status: 200, description: 'Returns list of driver orders' })
  async getDriverOrders(@CurrentUser() user: any, @Query('status') status?: OrderStatus) {
    return this.driversService.getDriverOrders(user.id, status);
  }

  @Post('requests/:orderId/accept')
  @ApiOperation({ summary: 'Accept an assigned order' })
  @ApiResponse({ status: 200, description: 'Order accepted successfully' })
  async acceptOrder(
    @CurrentUser() user: any,
    @Param('orderId') orderId: string,
    @Body() dto: AcceptOrderDto,
  ) {
    return this.driversService.acceptOrder(user.id, orderId, dto);
  }

  @Post('requests/:orderId/decline')
  @ApiOperation({ summary: 'Decline an assigned order' })
  @ApiResponse({ status: 200, description: 'Order declined successfully' })
  async declineOrder(
    @CurrentUser() user: any,
    @Param('orderId') orderId: string,
    @Body() dto: DeclineOrderDto,
  ) {
    return this.driversService.declineOrder(user.id, orderId, dto);
  }

  @Post('orders/:id/arrived-pickup')
  @ApiOperation({ summary: 'Mark arrived at pickup location' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async arrivedAtPickup(@CurrentUser() user: any, @Param('id') id: string) {
    return this.driversService.arrivedAtPickup(user.id, id);
  }

  @Post('orders/:id/start')
  @ApiOperation({ summary: 'Start the trip' })
  @ApiResponse({ status: 200, description: 'Trip started successfully' })
  async startTrip(@CurrentUser() user: any, @Param('id') id: string) {
    return this.driversService.startTrip(user.id, id);
  }

  @Post('orders/:id/complete')
  @ApiOperation({ summary: 'Complete the trip' })
  @ApiResponse({ status: 200, description: 'Trip completed successfully' })
  async completeTrip(@CurrentUser() user: any, @Param('id') id: string) {
    return this.driversService.completeTrip(user.id, id);
  }

  // ============= Document Management Endpoints =============

  @Get('verification-status')
  @ApiOperation({ summary: 'Get driver verification status' })
  @ApiResponse({ status: 200, description: 'Returns verification status' })
  async getVerificationStatus(@CurrentUser() user: any) {
    return this.driversService.getVerificationStatus(user.id);
  }

  @Get('documents')
  @ApiOperation({ summary: 'Get driver documents' })
  @ApiResponse({ status: 200, description: 'Returns list of driver documents' })
  async getDocuments(@CurrentUser() user: any) {
    return this.driversService.getDriverDocuments(user.id);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Upload a document' })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  async uploadDocument(@CurrentUser() user: any, @Body() dto: UploadDocumentDto) {
    return this.driversService.uploadDocument(user.id, dto);
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete a document' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  async deleteDocument(@CurrentUser() user: any, @Param('id') id: string) {
    return this.driversService.deleteDocument(user.id, id);
  }

  // ============= Vehicle Management Endpoints =============

  @Get('vehicles')
  @ApiOperation({ summary: 'Get driver vehicles' })
  @ApiResponse({ status: 200, description: 'Returns list of driver vehicles' })
  async getVehicles(@CurrentUser() user: any) {
    return this.driversService.getDriverVehicles(user.id);
  }

  @Post('vehicles')
  @ApiOperation({ summary: 'Create a vehicle' })
  @ApiResponse({ status: 201, description: 'Vehicle created successfully' })
  async createVehicle(@CurrentUser() user: any, @Body() dto: CreateVehicleDto) {
    return this.driversService.createVehicle(user.id, dto);
  }

  @Put('vehicles/:id')
  @ApiOperation({ summary: 'Update a vehicle' })
  @ApiResponse({ status: 200, description: 'Vehicle updated successfully' })
  async updateVehicle(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.driversService.updateVehicle(user.id, id, dto);
  }

  @Delete('vehicles/:id')
  @ApiOperation({ summary: 'Delete a vehicle' })
  @ApiResponse({ status: 200, description: 'Vehicle deleted successfully' })
  async deleteVehicle(@CurrentUser() user: any, @Param('id') id: string) {
    return this.driversService.deleteVehicle(user.id, id);
  }
}

// ============= Admin Driver Management Controller =============

@ApiTags('drivers')
@Controller('drivers')
@ApiBearerAuth()
export class DriversAdminController {
  constructor(private readonly driversService: DriversService) { }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ADMIN_SUPERVISOR, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all drivers with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of drivers' })
  async getAllDrivers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.driversService.getAllDrivers(page, limit, status);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ADMIN_SUPERVISOR, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get driver details by ID' })
  @ApiResponse({ status: 200, description: 'Returns driver details' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  async getDriverById(@Param('id') id: string) {
    return this.driversService.getDriverById(id);
  }

  @Post(':id/verify')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve driver verification' })
  @ApiResponse({ status: 200, description: 'Driver verified successfully' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  async verifyDriver(@Param('id') id: string, @CurrentUser() user: any) {
    return this.driversService.verifyDriver(id, user.id);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reject driver verification' })
  @ApiResponse({ status: 200, description: 'Driver rejected successfully' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  @ApiResponse({ status: 400, description: 'Rejection reason is required' })
  async rejectDriver(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.driversService.rejectDriver(id, reason, user.id);
  }

  @Post(':id/suspend')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Suspend driver account' })
  @ApiResponse({ status: 200, description: 'Driver suspended successfully' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  @ApiResponse({ status: 400, description: 'Suspension reason is required' })
  async suspendDriver(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.driversService.suspendDriver(id, reason, user.id);
  }
}
