import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Order } from '../../entities/order.entity';
import { Payment } from '../../entities/payment.entity';
import { DriverProfile } from '../../entities/driver-profile.entity';
import { VehicleType } from '../../entities/vehicle-type.entity';
import { Review } from '../../entities/review.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Order, Payment, DriverProfile, VehicleType, Review])],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
