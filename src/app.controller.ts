import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('health')
  @ApiOperation({ summary: 'Detailed health check' })
  getDetailedHealth() {
    return this.appService.getDetailedHealth();
  }

  @Get('health/ping')
  @ApiOperation({ summary: 'Simple health ping' })
  getHealthPing() {
    return this.appService.getHealthMessage();
  }
}
