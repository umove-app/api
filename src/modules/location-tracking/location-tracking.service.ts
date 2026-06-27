import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { DriverLocation } from '../../entities/driver-location.entity';
import { Order } from '../../entities/order.entity';
import { DriverProfile } from '../../entities/driver-profile.entity';
import { OrderStatus, DriverAvailabilityStatus } from '../../common/enums';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { REALTIME_EVENTS } from '../realtime/realtime.events';

export interface TrackLocationDto {
  orderId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

export interface UpdateDriverLocationDto {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

@Injectable()
export class LocationTrackingService {
  constructor(
    @InjectRepository(DriverLocation)
    private driverLocationRepository: Repository<DriverLocation>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(DriverProfile)
    private driverProfileRepository: Repository<DriverProfile>,
    private realtime: RealtimeGateway,
  ) {}

  async trackLocation(driverId: string, dto: TrackLocationDto) {
    // Verify order exists and driver is assigned
    const order = await this.orderRepository.findOne({
      where: { id: dto.orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.driverId !== driverId) {
      throw new BadRequestException('You are not assigned to this order');
    }

    // Only track location for active orders
    if (
      ![
        OrderStatus.ACCEPTED,
        OrderStatus.EN_ROUTE_TO_PICKUP,
        OrderStatus.ARRIVED_AT_PICKUP,
        OrderStatus.PICKED_UP,
        OrderStatus.STARTED,
        OrderStatus.EN_ROUTE_TO_DROPOFF,
      ].includes(order.status)
    ) {
      throw new BadRequestException('Order is not active');
    }

    // Save location point
    const location = this.driverLocationRepository.create({
      orderId: dto.orderId,
      driverId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      speed: dto.speed,
      heading: dto.heading,
      accuracy: dto.accuracy,
      capturedAt: new Date(),
    });

    await this.driverLocationRepository.save(location);

    // Update driver profile last known location
    await this.updateDriverProfileLocation(driverId, dto.latitude, dto.longitude);

    // Broadcast the driver's live position to everyone tracking this order
    // (the customer's active-trip / en-route screens).
    this.realtime.emitToOrder(dto.orderId, REALTIME_EVENTS.DRIVER_LOCATION_UPDATE, {
      orderId: dto.orderId,
      driverId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      heading: dto.heading,
      speed: dto.speed,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Location tracked successfully',
    };
  }

  async getOrderLocations(orderId: string, userId: string) {
    // Verify order exists and user has access
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Allow access to customer or driver
    if (order.customerId !== userId && order.driverId !== userId) {
      throw new BadRequestException('You do not have access to this order');
    }

    const locations = await this.driverLocationRepository.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });

    return locations;
  }

  async updateDriverLocation(driverId: string, dto: UpdateDriverLocationDto) {
    await this.updateDriverProfileLocation(driverId, dto.latitude, dto.longitude);

    return {
      success: true,
      message: 'Driver location updated successfully',
    };
  }

  async getDriverCurrentLocation(driverId: string) {
    const driverProfile = await this.driverProfileRepository.findOne({
      where: { userId: driverId },
    });

    if (!driverProfile) {
      throw new NotFoundException('Driver profile not found');
    }

    return {
      latitude: driverProfile.lastKnownLatitude,
      longitude: driverProfile.lastKnownLongitude,
      lastUpdate: driverProfile.lastLocationUpdate,
    };
  }

  private async updateDriverProfileLocation(driverId: string, latitude: number, longitude: number) {
    await this.driverProfileRepository.update(
      { userId: driverId },
      {
        lastKnownLatitude: latitude,
        lastKnownLongitude: longitude,
        lastLocationUpdate: new Date(),
      },
    );
  }

  // Admin methods
  async getAllDriverLocations() {
    const drivers = await this.driverProfileRepository.find({
      relations: ['user'],
    });

    return drivers
      .filter(driver => driver.lastKnownLatitude && driver.lastKnownLongitude)
      .map(driver => ({
        driverId: driver.userId,
        driverName: driver.user ? `${driver.user.firstName} ${driver.user.lastName}` : 'Unknown',
        phone: driver.user?.phoneNumber || driver.user?.phone,
        latitude: driver.lastKnownLatitude,
        longitude: driver.lastKnownLongitude,
        lastUpdate: driver.lastLocationUpdate,
        availabilityStatus: driver.availabilityStatus,
        isOnline: driver.availabilityStatus === DriverAvailabilityStatus.ONLINE,
        isOnTrip: driver.availabilityStatus === DriverAvailabilityStatus.ON_TRIP,
      }));
  }

  async getDriverLocationHistory(
    driverId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
  ) {
    const whereClause: any = { driverId };

    if (startDate && endDate) {
      whereClause.createdAt = Between(startDate, endDate);
    } else if (startDate) {
      whereClause.createdAt = MoreThanOrEqual(startDate);
    } else if (endDate) {
      whereClause.createdAt = LessThanOrEqual(endDate);
    }

    const locations = await this.driverLocationRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
      take: limit,
    });

    // Get driver profile info
    const driverProfile = await this.driverProfileRepository.findOne({
      where: { userId: driverId },
      relations: ['user'],
    });

    return {
      driver: driverProfile ? {
        id: driverId,
        name: `${driverProfile.user?.firstName} ${driverProfile.user?.lastName}`,
        phone: driverProfile.user?.phoneNumber || driverProfile.user?.phone,
        currentLocation: {
          latitude: driverProfile.lastKnownLatitude,
          longitude: driverProfile.lastKnownLongitude,
          lastUpdate: driverProfile.lastLocationUpdate,
        },
        availabilityStatus: driverProfile.availabilityStatus,
      } : null,
      history: locations.map(loc => ({
        id: loc.id,
        orderId: loc.orderId,
        latitude: loc.latitude,
        longitude: loc.longitude,
        speed: loc.speed,
        heading: loc.heading,
        accuracy: loc.accuracy,
        capturedAt: loc.capturedAt,
        createdAt: loc.createdAt,
      })),
      total: locations.length,
    };
  }

  async getOrderLocationTrailAdmin(orderId: string) {
    // Get order details
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['driver', 'customer'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Get location trail
    const locations = await this.driverLocationRepository.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });

    return {
      order: {
        id: order.id,
        status: order.status,
        pickupLocation: {
          latitude: order.pickupLatitude,
          longitude: order.pickupLongitude,
          address: order.pickupAddress,
        },
        destinationLocation: {
          latitude: order.destinationLatitude,
          longitude: order.destinationLongitude,
          address: order.destinationAddress,
        },
        driver: order.driver ? {
          id: order.driver.id,
          name: `${order.driver.firstName} ${order.driver.lastName}`,
          phone: order.driver.phoneNumber || order.driver.phone,
        } : null,
        customer: order.customer ? {
          id: order.customer.id,
          name: `${order.customer.firstName} ${order.customer.lastName}`,
          phone: order.customer.phoneNumber || order.customer.phone,
        } : null,
      },
      trail: locations.map(loc => ({
        latitude: loc.latitude,
        longitude: loc.longitude,
        speed: loc.speed,
        heading: loc.heading,
        capturedAt: loc.capturedAt,
      })),
      totalPoints: locations.length,
    };
  }
}
