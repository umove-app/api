import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleType } from '../../entities/vehicle-type.entity';
import { Promo } from '../../entities/promo.entity';
import { Settings } from '../../entities/settings.entity';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleType, Promo, Settings])],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
