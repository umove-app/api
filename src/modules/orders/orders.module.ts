import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../entities/order.entity';
import { OrderEvent } from '../../entities/order-event.entity';
import { User } from '../../entities/user.entity';
import { DriverProfile } from '../../entities/driver-profile.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { Promo } from '../../entities/promo.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PricingModule } from '../pricing/pricing.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderEvent, User, DriverProfile, Vehicle, Promo]),
    PricingModule,
    DispatchModule,
    RealtimeModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
