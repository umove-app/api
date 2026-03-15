import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { GetVehicleTypesDto } from './dto/get-vehicle-types.dto';
import { GetAvailableVehiclesDto } from './dto/get-available-vehicles.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Public()
  @Get('types')
  @ApiOperation({ summary: 'Get all vehicle types' })
  @ApiResponse({ status: 200, description: 'Returns list of vehicle types' })
  async getVehicleTypes(@Query() dto: GetVehicleTypesDto) {
    return this.vehiclesService.getVehicleTypes(dto);
  }

  @ApiBearerAuth()
  @Get('available')
  @ApiOperation({ summary: 'Get available vehicles near pickup location' })
  @ApiResponse({ status: 200, description: 'Returns list of available vehicles with distance' })
  async getAvailableVehicles(@Query() dto: GetAvailableVehiclesDto) {
    return this.vehiclesService.getAvailableVehicles(dto);
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get vehicle by ID' })
  @ApiResponse({ status: 200, description: 'Returns vehicle details' })
  async getVehicleById(@Param('id') id: string) {
    return this.vehiclesService.getVehicleById(id);
  }
}
