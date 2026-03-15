import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'UMove Logistics API',
      version: '1.0.0',
    };
  }

  getDetailedHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'UMove Logistics API',
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB',
      },
    };
  }

  getHealthMessage() {
    return 'UMove api is running fine';
  }
}
