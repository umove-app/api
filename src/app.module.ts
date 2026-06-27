import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import { APP_GUARD } from '@nestjs/core';
import * as winston from 'winston';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseConfig } from './config/database.config';
import { RedisModule } from './config/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { UsersModule } from './modules/users/users.module';
import { OrdersModule } from './modules/orders/orders.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PromosModule } from './modules/promos/promos.module';
import { AdminModule } from './modules/admin/admin.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AppRatingsModule } from './modules/app-ratings/app-ratings.module';
import { LocationTrackingModule } from './modules/location-tracking/location-tracking.module';
import { EmergenciesModule } from './modules/emergencies/emergencies.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Logging
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.ms(),
              winston.format.colorize({ all: true }),
              winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
                return `${timestamp} [${context || 'Application'}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
                  }`;
              }),
            ),
          }),
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
          }),
        ],
      }),
    }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useClass: DatabaseConfig,
    }),

    // Redis
    RedisModule,

    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get('THROTTLE_TTL', 60) * 1000,
          limit: configService.get('THROTTLE_LIMIT', 10),
        },
      ],
    }),

    // Application modules
    AuthModule,
    VehiclesModule,
    PricingModule,
    UsersModule,
    OrdersModule,
    DriversModule,
    TrackingModule,
    PaymentsModule,
    NotificationsModule,
    PromosModule,
    AdminModule,
    SettingsModule,
    AppRatingsModule,
    LocationTrackingModule,
    EmergenciesModule,
    RealtimeModule,
    DispatchModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule { }
