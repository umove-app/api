import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { GetOrdersDto } from './dto/get-orders.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('orders')
@Controller('orders')
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order/booking' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async createOrder(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders for current user' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of orders' })
  async getOrders(@CurrentUser() user: any, @Query() dto: GetOrdersDto) {
    return this.ordersService.getOrders(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Returns order details' })
  async getOrderById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.getOrderById(id, user.id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  async cancelOrder(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CancelOrderDto) {
    return this.ordersService.cancelOrder(id, user.id, dto);
  }

  // Driver-specific endpoints

  @Get('driver/available')
  @ApiOperation({ summary: 'Get available orders for driver' })
  @ApiResponse({ status: 200, description: 'Returns available orders nearby' })
  async getAvailableOrders(@CurrentUser() user: any) {
    return this.ordersService.getAvailableOrders(user.id);
  }

  @Get('driver/my-orders')
  @ApiOperation({ summary: 'Get driver orders' })
  @ApiResponse({ status: 200, description: 'Returns driver orders' })
  async getDriverOrders(@CurrentUser() user: any, @Query('status') status?: string) {
    return this.ordersService.getDriverOrders(user.id, status as any);
  }

  @Get('driver/active')
  @ApiOperation({ summary: 'Get active order for driver' })
  @ApiResponse({ status: 200, description: 'Returns active order' })
  async getActiveOrder(@CurrentUser() user: any) {
    return this.ordersService.getActiveOrder(user.id);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept an order as driver' })
  @ApiResponse({ status: 200, description: 'Order accepted successfully' })
  async acceptOrder(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.acceptOrder(id, user.id);
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Decline an order as driver' })
  @ApiResponse({ status: 200, description: 'Order declined successfully' })
  async declineOrder(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.ordersService.declineOrder(id, user.id, body.reason);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status as driver' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  async updateOrderStatus(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { status: string }) {
    return this.ordersService.updateOrderStatus(id, user.id, body.status as any);
  }
}
