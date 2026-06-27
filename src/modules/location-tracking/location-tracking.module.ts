import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationTrackingService } from './location-tracking.service';
import { LocationTrackingController, AdminLocationTrackingController } from './location-tracking.controller';
import { DriverLocation } from '../../entities/driver-location.entity';
import { Order } from '../../entities/order.entity';
import { DriverProfile } from '../../entities/driver-profile.entity';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [TypeOrmModule.forFeature([DriverLocation, Order, DriverProfile]), RealtimeModule],
  controllers: [LocationTrackingController, AdminLocationTrackingController],
  providers: [LocationTrackingService],
  exports: [LocationTrackingService],
})
export class LocationTrackingModule {}
