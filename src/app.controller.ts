import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  getHealth() {
    return this.appService.getHealth();
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Detailed health check' })
  getDetailedHealth() {
    return this.appService.getDetailedHealth();
  }

  @Public()
  @Get('health/ping')
  @ApiOperation({ summary: 'Simple health ping' })
  getHealthPing() {
    return this.appService.getHealthMessage();
  }
}
