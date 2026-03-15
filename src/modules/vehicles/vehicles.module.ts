import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleType } from '../../entities/vehicle-type.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { DriverProfile } from '../../entities/driver-profile.entity';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleType, Vehicle, DriverProfile])],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
