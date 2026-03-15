import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleType } from '../../entities/vehicle-type.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { DriverProfile } from '../../entities/driver-profile.entity';
import { GetVehicleTypesDto } from './dto/get-vehicle-types.dto';
import { GetAvailableVehiclesDto } from './dto/get-available-vehicles.dto';
import { DriverAvailabilityStatus } from '../../common/enums';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(VehicleType)
    private vehicleTypeRepository: Repository<VehicleType>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(DriverProfile)
    private driverProfileRepository: Repository<DriverProfile>,
  ) {}

  async getVehicleTypes(dto: GetVehicleTypesDto) {
    const query = this.vehicleTypeRepository.createQueryBuilder('vt');

    if (dto.country) {
      query.andWhere(':country = ANY(vt.availableCountries)', { country: dto.country });
    }

    if (dto.activeOnly !== false) {
      query.andWhere('vt.active = :active', { active: true });
    }

    query.orderBy('vt.sortOrder', 'ASC');

    return await query.getMany();
  }

  async getAvailableVehicles(dto: GetAvailableVehiclesDto) {
    const { pickupLat, pickupLng, vehicleType, radius = 10 } = dto;

    // Find online drivers within radius using Haversine formula
    const drivers = await this.driverProfileRepository
      .createQueryBuilder('dp')
      .select([
        'dp.id',
        'dp.userId',
        'dp.lastKnownLatitude',
        'dp.lastKnownLongitude',
        'dp.rating',
        'dp.totalTrips',
        'dp.completedTrips',
      ])
      .addSelect(
        `(6371 * acos(cos(radians(:pickupLat)) * cos(radians(dp.lastKnownLatitude)) * cos(radians(dp.lastKnownLongitude) - radians(:pickupLng)) + sin(radians(:pickupLat)) * sin(radians(dp.lastKnownLatitude))))`,
        'distance',
      )
      .where('dp.availabilityStatus = :status', { status: DriverAvailabilityStatus.ONLINE })
      .andWhere('dp.lastKnownLatitude IS NOT NULL')
      .andWhere('dp.lastKnownLongitude IS NOT NULL')
      .having('distance <= :radius', { radius })
      .setParameters({ pickupLat, pickupLng })
      .orderBy('distance', 'ASC')
      .getRawMany();

    if (drivers.length === 0) {
      return [];
    }

    const driverIds = drivers.map((d) => d.dp_id);

    // Get vehicles for these drivers
    const vehiclesQuery = this.vehicleRepository
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.driver', 'driver')
      .leftJoinAndSelect('driver.user', 'user')
      .where('v.driverId IN (:...driverIds)', { driverIds })
      .andWhere('v.active = :active', { active: true })
      .andWhere('v.verified = :verified', { verified: true });

    if (vehicleType) {
      vehiclesQuery.andWhere('v.type = :vehicleType', { vehicleType });
    }

    const vehicles = await vehiclesQuery.getMany();

    // Attach distance to vehicles
    return vehicles.map((vehicle) => {
      const driver = drivers.find((d) => d.dp_id === vehicle.driverId);
      return {
        ...vehicle,
        distance: driver ? parseFloat(driver.distance).toFixed(2) : null,
        estimatedArrival: driver ? this.calculateETA(parseFloat(driver.distance)) : null,
      };
    });
  }

  private calculateETA(distanceKm: number): number {
    // Assuming average speed of 40 km/h in city traffic
    const averageSpeedKmh = 40;
    const timeHours = distanceKm / averageSpeedKmh;
    return Math.ceil(timeHours * 60); // Return minutes
  }

  async getVehicleById(id: string) {
    return await this.vehicleRepository.findOne({
      where: { id },
      relations: ['driver', 'driver.user'],
    });
  }
}
