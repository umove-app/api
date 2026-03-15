import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriverLocation } from '../../entities/driver-location.entity';
import { Order } from '../../entities/order.entity';
import { OrderEvent } from '../../entities/order-event.entity';
import { DriverProfile } from '../../entities/driver-profile.entity';
import { UpdateLocationDto } from './dto/update-location.dto';
import { OrderStatus } from '../../common/enums';

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(DriverLocation)
    private driverLocationRepository: Repository<DriverLocation>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderEvent)
    private orderEventRepository: Repository<OrderEvent>,
    @InjectRepository(DriverProfile)
    private driverProfileRepository: Repository<DriverProfile>,
  ) {}

  async updateDriverLocation(userId: string, orderId: string, dto: UpdateLocationDto) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.driverId !== userId) {
      throw new ForbiddenException('You are not assigned to this order');
    }

    if (order.status !== OrderStatus.STARTED && order.status !== OrderStatus.EN_ROUTE_TO_PICKUP) {
      throw new BadRequestException('Can only update location for active trips');
    }

    // Save location point
    const location = this.driverLocationRepository.create({
      orderId,
      driverId: userId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      speed: dto.speed,
      heading: dto.heading,
      accuracy: dto.accuracy,
      capturedAt: new Date(),
    });

    await this.driverLocationRepository.save(location);

    // Update driver profile last known location
    await this.driverProfileRepository.update(
      { userId },
      {
        lastKnownLatitude: dto.latitude,
        lastKnownLongitude: dto.longitude,
        lastLocationUpdate: new Date(),
      },
    );

    return { message: 'Location updated successfully' };
  }

  async getOrderTracking(orderId: string, userId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['customer', 'driver'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only customer or driver can track
    if (order.customerId !== userId && order.driverId !== userId) {
      throw new ForbiddenException('You do not have access to this order tracking');
    }

    // Get location history
    const locations = await this.driverLocationRepository.find({
      where: { orderId },
      order: { capturedAt: 'ASC' },
    });

    // Get latest location
    const latestLocation = locations.length > 0 ? locations[locations.length - 1] : null;

    return {
      orderId: order.id,
      status: order.status,
      currentLocation: latestLocation
        ? {
            latitude: latestLocation.latitude,
            longitude: latestLocation.longitude,
            speed: latestLocation.speed,
            heading: latestLocation.heading,
            capturedAt: latestLocation.capturedAt,
          }
        : null,
      route: locations.map((loc) => ({
        latitude: loc.latitude,
        longitude: loc.longitude,
        capturedAt: loc.capturedAt,
      })),
      pickup: {
        address: order.pickupAddress,
        latitude: order.pickupLatitude,
        longitude: order.pickupLongitude,
      },
      destination: {
        address: order.destinationAddress,
        latitude: order.destinationLatitude,
        longitude: order.destinationLongitude,
      },
    };
  }

  async getOrderEvents(orderId: string, userId: string) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== userId && order.driverId !== userId) {
      throw new ForbiddenException('You do not have access to this order timeline');
    }

    const events = await this.orderEventRepository.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });

    return events;
  }
}
