import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { OrderEvent } from '../../entities/order-event.entity';
import { User } from '../../entities/user.entity';
import { DriverProfile } from '../../entities/driver-profile.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { Promo } from '../../entities/promo.entity';
import { PricingService } from '../pricing/pricing.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { GetOrdersDto } from './dto/get-orders.dto';
import { OrderStatus, OrderEventType, DriverAvailabilityStatus, UserRole } from '../../common/enums';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderEvent)
    private orderEventRepository: Repository<OrderEvent>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(DriverProfile)
    private driverProfileRepository: Repository<DriverProfile>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(Promo)
    private promoRepository: Repository<Promo>,
    private pricingService: PricingService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Calculate pricing
    const quote = await this.pricingService.calculateQuote({
      pickupLatitude: dto.pickupLatitude,
      pickupLongitude: dto.pickupLongitude,
      destinationLatitude: dto.destinationLatitude,
      destinationLongitude: dto.destinationLongitude,
      vehicleType: dto.vehicleType,
      country: user.country,
      promoCode: dto.promoCode,
    });

    // Create order
    const order = this.orderRepository.create({
      customerId: userId,
      orderType: dto.orderType,
      pickupAddress: dto.pickupAddress,
      pickupLatitude: dto.pickupLatitude,
      pickupLongitude: dto.pickupLongitude,
      pickupPhone: dto.pickupPhone,
      pickupNotes: dto.pickupNotes,
      destinationAddress: dto.destinationAddress,
      destinationLatitude: dto.destinationLatitude,
      destinationLongitude: dto.destinationLongitude,
      destinationPhone: dto.destinationPhone,
      destinationNotes: dto.destinationNotes,
      vehicleType: dto.vehicleType,
      estimatedDistance: quote.estimatedDistance,
      estimatedDuration: quote.estimatedDuration,
      subtotal: quote.subtotal,
      vat: quote.vat,
      vatRate: quote.vatRate,
      discount: quote.discount,
      promoCode: quote.promoCode,
      total: quote.total,
      currency: quote.currency,
      status: OrderStatus.CREATED,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      isScheduled: !!dto.scheduledAt,
    } as any);

    const savedOrder = (await this.orderRepository.save(order)) as unknown as Order;

    // Create order event
    await this.createOrderEvent(savedOrder.id, OrderEventType.CREATED, 'Order created', userId);

    // Auto-assign driver if not scheduled and preferred driver not specified
    if (!dto.scheduledAt && !dto.preferredDriverId) {
      await this.autoAssignDriver(savedOrder.id);
    } else if (dto.preferredDriverId) {
      await this.assignDriver(savedOrder.id, dto.preferredDriverId, userId);
    }

    // Update promo usage if applied
    if (dto.promoCode) {
      await this.incrementPromoUsage(dto.promoCode);
    }

    return this.getOrderById(savedOrder.id, userId);
  }

  async getOrders(userId: string, dto: GetOrdersDto) {
    const { status, page = 1, limit = 10 } = dto;

    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.driver', 'driver')
      .leftJoinAndSelect('order.vehicle', 'vehicle')
      .where('order.customerId = :userId', { userId });

    if (status) {
      query.andWhere('order.status = :status', { status });
    }

    query.orderBy('order.createdAt', 'DESC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const [orders, total] = await query.getManyAndCount();

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderById(orderId: string, userId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['customer', 'driver', 'vehicle', 'events', 'payment'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== userId && order.driverId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return order;
  }

  async cancelOrder(orderId: string, userId: string, dto: CancelOrderDto) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== userId) {
      throw new ForbiddenException('Only the customer can cancel this order');
    }

    if ([OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.DELIVERED].includes(order.status)) {
      throw new BadRequestException('Cannot cancel order in current status');
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();
    order.cancelledBy = userId;
    order.cancellationReason = dto.reason;

    await this.orderRepository.save(order);

    // Create event
    await this.createOrderEvent(orderId, OrderEventType.CANCELLED, `Order cancelled: ${dto.reason}`, userId);

    // Update driver availability if assigned
    if (order.driverId) {
      await this.updateDriverAvailability(order.driverId, DriverAvailabilityStatus.ONLINE);
    }

    return this.getOrderById(orderId, userId);
  }

  private async autoAssignDriver(orderId: string) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) return;

    // Find nearest available driver with matching vehicle type
    const drivers = await this.driverProfileRepository
      .createQueryBuilder('dp')
      .select(['dp.id', 'dp.userId', 'dp.lastKnownLatitude', 'dp.lastKnownLongitude'])
      .addSelect(
        `(6371 * acos(cos(radians(:pickupLat)) * cos(radians(dp.lastKnownLatitude)) * cos(radians(dp.lastKnownLongitude) - radians(:pickupLng)) + sin(radians(:pickupLat)) * sin(radians(dp.lastKnownLatitude))))`,
        'distance',
      )
      .where('dp.availabilityStatus = :status', { status: DriverAvailabilityStatus.ONLINE })
      .andWhere('dp.kycStatus = :kycStatus', { kycStatus: 'APPROVED' })
      .andWhere('dp.lastKnownLatitude IS NOT NULL')
      .andWhere('dp.lastKnownLongitude IS NOT NULL')
      .having('distance <= :radius', { radius: 10 })
      .setParameters({ pickupLat: order.pickupLatitude, pickupLng: order.pickupLongitude })
      .orderBy('distance', 'ASC')
      .limit(1)
      .getRawOne();

    if (drivers) {
      // Get vehicle for this driver
      const vehicle = await this.vehicleRepository.findOne({
        where: {
          driverId: drivers.dp_id,
          type: order.vehicleType,
          active: true,
          verified: true,
        },
      });

      if (vehicle) {
        await this.assignDriver(orderId, drivers.dp_userId, 'SYSTEM');
      }
    }
  }

  private async assignDriver(orderId: string, driverId: string, assignedBy: string) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) return;

    const driver = await this.userRepository.findOne({ where: { id: driverId, role: UserRole.DRIVER } });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const vehicle = await this.vehicleRepository.findOne({
      where: { driver: { userId: driverId }, type: order.vehicleType, active: true },
    });

    if (!vehicle) {
      throw new BadRequestException('Driver does not have a matching vehicle');
    }

    order.driverId = driverId;
    order.vehicleId = vehicle.id;
    order.status = OrderStatus.DRIVER_ASSIGNED;
    order.assignedAt = new Date();

    await this.orderRepository.save(order);

    // Update driver status
    await this.updateDriverAvailability(driverId, DriverAvailabilityStatus.ON_TRIP);

    // Create event
    await this.createOrderEvent(orderId, OrderEventType.DRIVER_ASSIGNED, 'Driver assigned to order', assignedBy);
  }

  private async createOrderEvent(orderId: string, eventType: OrderEventType, message: string, performedBy: string) {
    const event = this.orderEventRepository.create({
      orderId,
      eventType,
      message,
      performedBy,
    });

    await this.orderEventRepository.save(event);
  }

  private async updateDriverAvailability(userId: string, status: DriverAvailabilityStatus) {
    await this.driverProfileRepository.update({ userId }, { availabilityStatus: status });
  }

  private async incrementPromoUsage(code: string) {
    await this.promoRepository.increment({ code }, 'currentUsage', 1);
  }

  // Driver-specific methods

  async getAvailableOrders(driverId: string) {
    // Get driver profile to check location and vehicle types
    const driverProfile = await this.driverProfileRepository.findOne({
      where: { userId: driverId },
      relations: ['vehicles'],
    });

    if (!driverProfile) {
      throw new NotFoundException('Driver profile not found');
    }

    // Get orders that are awaiting driver assignment within 10km radius
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .where('order.status IN (:...statuses)', {
        statuses: [OrderStatus.CREATED, OrderStatus.DRIVER_ASSIGNED],
      })
      .andWhere('order.driverId IS NULL OR order.driverId = :driverId', { driverId })
      .andWhere(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(order.pickupLatitude)) * cos(radians(order.pickupLongitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(order.pickupLatitude)))) <= :radius`,
      )
      .setParameters({
        lat: driverProfile.lastKnownLatitude || 0,
        lng: driverProfile.lastKnownLongitude || 0,
        radius: 10,
      })
      .orderBy('order.createdAt', 'DESC')
      .getMany();

    return orders;
  }

  async getDriverOrders(driverId: string, status?: OrderStatus) {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.vehicle', 'vehicle')
      .where('order.driverId = :driverId', { driverId });

    if (status) {
      query.andWhere('order.status = :status', { status });
    }

    query.orderBy('order.createdAt', 'DESC');

    return await query.getMany();
  }

  async getActiveOrder(driverId: string) {
    const order = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.vehicle', 'vehicle')
      .where('order.driverId = :driverId', { driverId })
      .andWhere('order.status NOT IN (:...statuses)', {
        statuses: [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.FAILED],
      })
      .orderBy('order.createdAt', 'DESC')
      .getOne();

    return order;
  }

  async acceptOrder(orderId: string, driverId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['customer'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.CREATED && order.status !== OrderStatus.DRIVER_ASSIGNED) {
      throw new BadRequestException('Order is no longer available');
    }

    // Check if driver has an active order
    const activeOrder = await this.getActiveOrder(driverId);
    if (activeOrder) {
      throw new BadRequestException('You already have an active order');
    }

    // Get driver's vehicle
    const vehicle = await this.vehicleRepository.findOne({
      where: {
        driver: { userId: driverId },
        type: order.vehicleType,
        active: true,
        verified: true,
      },
    });

    if (!vehicle) {
      throw new BadRequestException('You do not have a matching vehicle for this order');
    }

    // Accept the order
    order.driverId = driverId;
    order.vehicleId = vehicle.id;
    order.status = OrderStatus.ACCEPTED;
    order.acceptedAt = new Date();

    await this.orderRepository.save(order);

    // Update driver availability
    await this.updateDriverAvailability(driverId, DriverAvailabilityStatus.ON_TRIP);

    // Create event
    await this.createOrderEvent(orderId, OrderEventType.DRIVER_ACCEPTED, 'Driver accepted the order', driverId);

    return this.getOrderById(orderId, driverId);
  }

  async declineOrder(orderId: string, driverId: string, reason?: string) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.driverId === driverId) {
      // If driver was assigned, clear assignment
      order.driverId = null;
      order.vehicleId = null;
      order.status = OrderStatus.CREATED;
      await this.orderRepository.save(order);

      // Try to auto-assign another driver
      await this.autoAssignDriver(orderId);
    }

    // Create event
    await this.createOrderEvent(
      orderId,
      OrderEventType.DRIVER_DECLINED,
      `Driver declined: ${reason || 'No reason provided'}`,
      driverId,
    );

    return { success: true, message: 'Order declined' };
  }

  async updateOrderStatus(orderId: string, driverId: string, status: OrderStatus) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.driverId !== driverId) {
      throw new ForbiddenException('You are not assigned to this order');
    }

    const now = new Date();
    let eventMessage = '';

    switch (status) {
      case OrderStatus.EN_ROUTE_TO_PICKUP:
        eventMessage = 'Driver is en route to pickup location';
        break;
      case OrderStatus.ARRIVED_AT_PICKUP:
        order.arrivedAtPickupAt = now;
        eventMessage = 'Driver arrived at pickup location';
        break;
      case OrderStatus.PICKED_UP:
        order.pickedUpAt = now;
        order.startedAt = now;
        eventMessage = 'Order picked up';
        break;
      case OrderStatus.EN_ROUTE_TO_DROPOFF:
        eventMessage = 'Driver is en route to dropoff location';
        break;
      case OrderStatus.DELIVERED:
        order.deliveredAt = now;
        order.arrivedAtDestinationAt = now;
        eventMessage = 'Order delivered';
        break;
      case OrderStatus.COMPLETED:
        order.completedAt = now;
        eventMessage = 'Order completed';
        // Update driver availability
        await this.updateDriverAvailability(driverId, DriverAvailabilityStatus.ONLINE);
        // Update driver stats
        await this.updateDriverStats(driverId, order);
        break;
      default:
        throw new BadRequestException('Invalid status transition');
    }

    order.status = status;
    await this.orderRepository.save(order);

    // Create event
    await this.createOrderEvent(orderId, status as unknown as OrderEventType, eventMessage, driverId);

    return this.getOrderById(orderId, driverId);
  }

  private async updateDriverStats(driverId: string, order: Order) {
    const driverProfile = await this.driverProfileRepository.findOne({
      where: { userId: driverId },
    });

    if (driverProfile) {
      driverProfile.totalTrips += 1;
      driverProfile.completedTrips += 1;

      // Recalculate rating if needed
      // This would typically involve fetching all reviews and calculating average
      await this.driverProfileRepository.save(driverProfile);
    }
  }
}
