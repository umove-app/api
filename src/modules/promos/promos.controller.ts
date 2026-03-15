import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PromosService } from './promos.service';
import { CreatePromoDto } from './dto/create-promo.dto';
import { UpdatePromoDto } from './dto/update-promo.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('promos')
@Controller('promos')
@ApiBearerAuth()
export class PromosController {
  constructor(private readonly promosService: PromosService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new promo code (Admin only)' })
  @ApiResponse({ status: 201, description: 'Promo created successfully' })
  async createPromo(@Body() dto: CreatePromoDto) {
    return this.promosService.createPromo(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ADMIN_SUPERVISOR)
  @ApiOperation({ summary: 'Get all promos with pagination (Admin only)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Returns paginated list of promos' })
  async getAllPromos(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.promosService.getAllPromos(page, limit, isActive);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ADMIN_SUPERVISOR)
  @ApiOperation({ summary: 'Get promo by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns promo details' })
  async getPromoById(@Param('id') id: string) {
    return this.promosService.getPromoById(id);
  }

  @Get('code/:code')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ADMIN_SUPERVISOR)
  @ApiOperation({ summary: 'Get promo by code (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns promo details' })
  async getPromoByCode(@Param('code') code: string) {
    return this.promosService.getPromoByCode(code);
  }

  @Get(':id/stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ADMIN_SUPERVISOR)
  @ApiOperation({ summary: 'Get promo usage statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns promo stats including usage and availability' })
  async getPromoStats(@Param('id') id: string) {
    return this.promosService.getPromoStats(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update promo (Admin only)' })
  @ApiResponse({ status: 200, description: 'Promo updated successfully' })
  async updatePromo(@Param('id') id: string, @Body() dto: UpdatePromoDto) {
    return this.promosService.updatePromo(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Deactivate promo (Admin only)' })
  @ApiResponse({ status: 200, description: 'Promo deactivated successfully' })
  async deactivatePromo(@Param('id') id: string) {
    return this.promosService.deactivatePromo(id);
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Activate promo (Admin only)' })
  @ApiResponse({ status: 200, description: 'Promo activated successfully' })
  async activatePromo(@Param('id') id: string) {
    return this.promosService.activatePromo(id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete promo (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Promo deleted successfully' })
  async deletePromo(@Param('id') id: string) {
    return this.promosService.deletePromo(id);
  }
}
