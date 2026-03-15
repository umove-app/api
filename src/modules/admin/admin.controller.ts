import { Controller, Get, Put, Post, Delete, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, OrderStatus } from '../../common/enums';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaymentAnalyticsDto } from './dto/admin-stats.dto';
import { CreateVehicleTypeDto } from './dto/create-vehicle-type.dto';
import { UpdateVehicleTypeDto } from './dto/update-vehicle-type.dto';

@ApiTags('admin')
@Controller('admin')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Dashboard & Analytics - Admin, Admin Supervisor, Super Admin
  @Get('dashboard/stats')
  @Roles(UserRole.ADMIN, UserRole.ADMIN_SUPERVISOR, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get dashboard statistics (Admin, Supervisor, Super Admin)' })
  @ApiResponse({ status: 200, description: 'Returns dashboard stats' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('analytics/user-registrations')
  @Roles(UserRole.ADMIN, UserRole.ADMIN_SUPERVISOR, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get user registration analytics (Admin, Supervisor, Super Admin)' })
  @ApiQuery({ name: 'startDate', required: true, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2024-12-31' })
  @ApiResponse({ status: 200, description: 'Returns user registration stats' })
  async getUserRegistrationStats(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    // Parse dates from YYYY-MM-DD format, treating them as local dates
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);
    return this.adminService.getUserRegistrationStats(start, end);
  }

  @Get('analytics/payments')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get payment analytics (Super Admin only)' })
  @ApiQuery({ name: 'startDate', required: true, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2024-12-31' })
  @ApiResponse({ status: 200, description: 'Returns payment stats with summary and detailed breakdown' })
  async getPaymentStats(@Query('startDate') startDate: string, @Query('endDate') endDate: string): Promise<PaymentAnalyticsDto> {
    // Parse dates from YYYY-MM-DD format, treating them as local dates
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);
    return this.adminService.getPaymentStats(start, end);
  }

  @Get('analytics/orders')
  @Roles(UserRole.ADMIN, UserRole.ADMIN_SUPERVISOR, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get order analytics (Admin, Supervisor, Super Admin)' })
  @ApiQuery({ name: 'startDate', required: true, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2024-12-31' })
  @ApiResponse({ status: 200, description: 'Returns order stats' })
  async getOrderStats(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    // Parse dates from YYYY-MM-DD format, treating them as local dates
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);
    return this.adminService.getOrderStats(start, end);
  }

  @Get('analytics/driver-performance')
  @Roles(UserRole.ADMIN, UserRole.ADMIN_SUPERVISOR, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get driver performance analytics (Admin, Supervisor, Super Admin)' })
  @ApiQuery({ name: 'startDate', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2024-12-31' })
  @ApiResponse({ status: 200, description: 'Returns driver performance stats' })
  async getDriverPerformance(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.adminService.getDriverPerformance(start, end);
  }

  @Get('analytics/vehicle-utilization')
  @Roles(UserRole.ADMIN, UserRole.ADMIN_SUPERVISOR, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get vehicle utilization analytics (Admin, Supervisor, Super Admin)' })
  @ApiQuery({ name: 'startDate', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2024-12-31' })
  @ApiResponse({ status: 200, description: 'Returns vehicle utilization stats' })
  async getVehicleUtilization(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.adminService.getVehicleUtilization(start, end);
  }

  // User Management - Admin and Super Admin
  @Get('users')
  @Roles(UserRole.ADMIN, UserRole.ADMIN_SUPERVISOR, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all users with pagination (Admin, Supervisor, Super Admin)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'search', required: false, example: 'john' })
  @ApiResponse({ status: 200, description: 'Returns paginated users list' })
  async getAllUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: UserRole,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllUsers(page, limit, role, search);
  }

  @Get('users/:id')
  @Roles(UserRole.ADMIN, UserRole.ADMIN_SUPERVISOR, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get user by ID (Admin, Supervisor, Super Admin)' })
  @ApiResponse({ status: 200, description: 'Returns user details' })
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Put('users/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update user (Admin, Super Admin)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Patch('users/:id/suspend')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Suspend user (Admin, Super Admin)' })
  @ApiResponse({ status: 200, description: 'User suspended successfully' })
  async suspendUser(@Param('id') id: string, @Body('reason') reason: string) {
    return this.adminService.suspendUser(id, reason);
  }

  @Patch('users/:id/activate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Activate user (Admin, Super Admin)' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  async activateUser(@Param('id') id: string) {
    return this.adminService.activateUser(id);
  }

  @Delete('users/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete user (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  // Order Management - All Admin Roles
  @Get('orders')
  @Roles(UserRole.ADMIN, UserRole.ADMIN_SUPERVISOR, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all orders with filters (Admin, Supervisor, Super Admin)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'startDate', required: false, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2024-12-31' })
  @ApiResponse({ status: 200, description: 'Returns paginated orders list' })
  async getAllOrders(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: OrderStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.adminService.getAllOrders(page, limit, status, start, end);
  }

  @Get('orders/:id')
  @Roles(UserRole.ADMIN, UserRole.ADMIN_SUPERVISOR, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get order details (Admin, Supervisor, Super Admin)' })
  @ApiResponse({ status: 200, description: 'Returns order details' })
  async getOrderById(@Param('id') id: string) {
    return this.adminService.getOrderById(id);
  }

  // Driver Monitoring - All Admin Roles
  @Get('drivers/active')
  @Roles(UserRole.ADMIN, UserRole.ADMIN_SUPERVISOR, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all active drivers with locations (Admin, Supervisor, Super Admin)' })
  @ApiResponse({ status: 200, description: 'Returns active drivers list' })
  async getActiveDrivers() {
    return this.adminService.getActiveDrivers();
  }

  @Get('drivers/:id/current-order')
  @Roles(UserRole.ADMIN, UserRole.ADMIN_SUPERVISOR, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get driver current order (Admin, Supervisor, Super Admin)' })
  @ApiResponse({ status: 200, description: 'Returns driver current order' })
  async getDriverCurrentOrder(@Param('id') driverId: string) {
    return this.adminService.getDriverCurrentOrder(driverId);
  }

  // Vehicle Type Management - Admin and Super Admin
  @Get('vehicles/types')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all vehicle types with pagination (Admin, Super Admin)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Returns paginated vehicle types list' })
  async getAllVehicleTypes(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getAllVehicleTypes(page, limit);
  }

  @Get('vehicles/types/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get vehicle type by ID (Admin, Super Admin)' })
  @ApiResponse({ status: 200, description: 'Returns vehicle type details' })
  async getVehicleTypeById(@Param('id') id: string) {
    return this.adminService.getVehicleTypeById(id);
  }

  @Post('vehicles/types')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create vehicle type (Admin, Super Admin)' })
  @ApiResponse({ status: 201, description: 'Vehicle type created successfully' })
  async createVehicleType(@Body() dto: CreateVehicleTypeDto) {
    return this.adminService.createVehicleType(dto);
  }

  @Put('vehicles/types/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update vehicle type (Admin, Super Admin)' })
  @ApiResponse({ status: 200, description: 'Vehicle type updated successfully' })
  async updateVehicleType(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleTypeDto,
  ) {
    return this.adminService.updateVehicleType(id, dto);
  }

  @Delete('vehicles/types/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete vehicle type (Admin, Super Admin)' })
  @ApiResponse({ status: 200, description: 'Vehicle type deleted successfully' })
  async deleteVehicleType(@Param('id') id: string) {
    return this.adminService.deleteVehicleType(id);
  }
}
