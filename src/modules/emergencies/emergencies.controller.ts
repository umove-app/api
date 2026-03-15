import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EmergenciesService } from './emergencies.service';
import { CreateEmergencyDto } from './dto/create-emergency.dto';
import { UpdateEmergencyDto } from './dto/update-emergency.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { EmergencyStatus, EmergencyType } from '../../entities/emergency.entity';

// Customer/Driver Endpoints
@ApiTags('emergencies')
@Controller('emergencies')
@ApiBearerAuth()
export class EmergenciesController {
    constructor(private readonly emergenciesService: EmergenciesService) { }

    @Post()
    @ApiOperation({ summary: 'Report an emergency' })
    @ApiResponse({ status: 201, description: 'Emergency reported successfully' })
    async create(
        @CurrentUser() user: any,
        @Body() dto: CreateEmergencyDto,
    ) {
        return this.emergenciesService.create(user.id, user.role, dto);
    }

    @Get('my')
    @ApiOperation({ summary: 'Get my emergency history' })
    @ApiResponse({ status: 200, description: 'Returns user emergency history' })
    async getMyEmergencies(@CurrentUser() user: any) {
        return this.emergenciesService.findByUser(user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get emergency details' })
    @ApiResponse({ status: 200, description: 'Returns emergency details' })
    async getOne(@Param('id') id: string) {
        return this.emergenciesService.findOne(id);
    }
}

// Admin Endpoints
@ApiTags('admin/emergencies')
@Controller('admin/emergencies')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.ADMIN_SUPERVISOR, UserRole.SUPER_ADMIN)
export class AdminEmergenciesController {
    constructor(private readonly emergenciesService: EmergenciesService) { }

    @Get()
    @ApiOperation({ summary: 'Get all emergencies (admin)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false, enum: EmergencyStatus })
    @ApiQuery({ name: 'type', required: false, enum: EmergencyType })
    @ApiResponse({ status: 200, description: 'Returns paginated emergencies' })
    async getAll(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('status') status?: EmergencyStatus,
        @Query('type') type?: EmergencyType,
    ) {
        return this.emergenciesService.findAll(page, limit, status, type);
    }

    @Get('recent')
    @ApiOperation({ summary: 'Get recent active emergencies for dashboard' })
    @ApiResponse({ status: 200, description: 'Returns recent emergencies' })
    async getRecent(@Query('limit') limit?: number) {
        return this.emergenciesService.findRecent(limit);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get emergency statistics' })
    @ApiResponse({ status: 200, description: 'Returns emergency stats' })
    async getStats() {
        return this.emergenciesService.getStats();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get emergency details (admin)' })
    @ApiResponse({ status: 200, description: 'Returns emergency details' })
    async getOne(@Param('id') id: string) {
        return this.emergenciesService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update emergency status (admin)' })
    @ApiResponse({ status: 200, description: 'Emergency updated' })
    async update(
        @Param('id') id: string,
        @CurrentUser() admin: any,
        @Body() dto: UpdateEmergencyDto,
    ) {
        return this.emergenciesService.update(id, admin.id, dto);
    }
}
