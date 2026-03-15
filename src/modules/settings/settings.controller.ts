import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('settings')
@Controller('settings')
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get system settings (Public)' })
  @ApiResponse({ status: 200, description: 'Returns system settings' })
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Put()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update system settings (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(dto);
  }
}
