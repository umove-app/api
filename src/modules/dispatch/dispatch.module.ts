import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../entities/order.entity';
import { DriverProfile } from '../../entities/driver-profile.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { DispatchService } from './dispatch.service';

/**
 * Dispatch engine module. Depends on RealtimeModule for pushing offers and the
 * (global) RedisModule for atomic locking / offer state.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Order, DriverProfile, Vehicle]),
    RealtimeModule,
  ],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
