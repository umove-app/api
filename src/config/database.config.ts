import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { DriverProfile } from '../entities/driver-profile.entity';
import { DriverDocument } from '../entities/driver-document.entity';
import { DriverLocation } from '../entities/driver-location.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { VehicleType } from '../entities/vehicle-type.entity';
import { Order } from '../entities/order.entity';
import { OrderEvent } from '../entities/order-event.entity';
import { Payment } from '../entities/payment.entity';
import { Promo } from '../entities/promo.entity';
import { Notification } from '../entities/notification.entity';
import { Review } from '../entities/review.entity';
import { AppRating } from '../entities/app-rating.entity';
import { Settings } from '../entities/settings.entity';
import { AdminProfile } from '../entities/admin-profile.entity';
import { Emergency } from '../entities/emergency.entity';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.configService.get('DB_HOST', 'localhost'),
      port: this.configService.get('DB_PORT', 5432),
      username: this.configService.get('DB_USERNAME', 'umove_user'),
      password: this.configService.get('DB_PASSWORD', ''),
      database: this.configService.get('DB_DATABASE', 'umove_db'),
      entities: [
        User,
        DriverProfile,
        DriverDocument,
        DriverLocation,
        Vehicle,
        VehicleType,
        Order,
        OrderEvent,
        Payment,
        Promo,
        Notification,
        Review,
        AppRating,
        Settings,
        AdminProfile,
        Emergency,
      ],
      synchronize: false, // Use migrations for schema management - NEVER use synchronize in production
      logging: this.configService.get('DB_LOGGING', false),
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      migrationsRun: true, // Auto-run migrations on startup
      ssl: this.configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
    };
  }
}
