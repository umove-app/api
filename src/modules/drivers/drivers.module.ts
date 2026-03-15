import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverProfile } from '../../entities/driver-profile.entity';
import { DriverDocument } from '../../entities/driver-document.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { Order } from '../../entities/order.entity';
import { OrderEvent } from '../../entities/order-event.entity';
import { User } from '../../entities/user.entity';
import { DriversController, DriversAdminController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { S3UploadService } from '../../common/services/s3-upload.service';

@Module({
  imports: [TypeOrmModule.forFeature([DriverProfile, DriverDocument, Vehicle, Order, OrderEvent, User])],
  controllers: [DriversController, DriversAdminController],
  providers: [DriversService, S3UploadService],
  exports: [DriversService, S3UploadService],
})
export class DriversModule { }

