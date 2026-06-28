import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
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
import { OrderStatus, OrderType, OrderEventType, DriverAvailabilityStatus, UserRole, DriverKycStatus, OrderPaymentMode } from '../../common/enums';
import { DispatchService } from '../dispatch/dispatch.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { REALTIME_EVENTS } from '../realtime/realtime.events';

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
    private dispatchService: DispatchService,
    private realtime: RealtimeGateway,
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

    // Determine payment mode. Passenger orders MUST be prepaid; only goods may
    // choose pay-on-delivery. Default to PREPAID when unspecified.
    const requestedMode = dto.paymentMode ?? OrderPaymentMode.PREPAID;
    const paymentMode =
      dto.orderType === OrderType.PASSENGER
        ? OrderPaymentMode.PREPAID
        : requestedMode;

    // Create order
    const order = this.orderRepository.create({
      customerId: userId,
      orderType: dto.orderType,
      paymentMode,
      isPaid: false,
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

    // Update promo usage if applied
    if (dto.promoCode) {
      await this.incrementPromoUsage(dto.promoCode);
    }

    // Dispatch gating:
    //  - PREPAID orders are NOT dispatched until payment succeeds (dispatch is
    //    triggered from the payment-verification flow). The client must call
    //    the payment endpoints before the order is offered to drivers.
    //  - PAY_ON_DELIVERY (goods) orders dispatch immediately.
    //  - scheduled orders are deferred (handled when due), regardless of mode.
    const awaitingPayment = paymentMode === OrderPaymentMode.PREPAID;

    if (dto.preferredDriverId && !awaitingPayment) {
      await this.assignDriver(savedOrder.id, dto.preferredDriverId, userId);
    } else if (!dto.scheduledAt && !awaitingPayment) {
      // Fire-and-forget: dispatch proceeds asynchronously via realtime offers.
      this.dispatchService
        .dispatchOrder(savedOrder.id)
        .catch((err) => console.error('dispatchOrder failed', err));
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

    // Stop any in-flight dispatch for this order.
    await this.dispatchService.cancelDispatch(orderId);

    // Update driver availability if assigned, and notify the driver in real time.
    if (order.driverId) {
      await this.updateDriverAvailability(order.driverId, DriverAvailabilityStatus.ONLINE);
      this.realtime.emitToUser(order.driverId, REALTIME_EVENTS.ORDER_CANCELLED, {
        orderId,
        reason: dto.reason,
      });
    }
    this.realtime.emitToOrder(orderId, REALTIME_EVENTS.ORDER_CANCELLED, {
      orderId,
      reason: dto.reason,
    });

    return this.getOrderById(orderId, userId);
  }

  /**
   * Directly assign a specific (preferred) driver to an order and immediately
   * offer it to them via the dispatch engine. General auto-dispatch is handled
   * by DispatchService (expanding-radius offers), not here.
   */
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

    order.status = OrderStatus.DRIVER_ASSIGNED;
    order.assignedAt = new Date();
    // Note: driver is NOT set ON_TRIP and the order's driverId is left null
    // until the driver actually accepts; we only pre-target the preferred driver.
    await this.orderRepository.save(order);

    // Create event
    await this.createOrderEvent(orderId, OrderEventType.DRIVER_ASSIGNED, 'Driver assigned to order', assignedBy);

    // Offer the order directly to the preferred driver via the dispatch engine,
    // which still applies the atomic accept lock and offer timeout.
    this.dispatchService
      .dispatchOrder(orderId)
      .catch((err) => console.error('preferred dispatchOrder failed', err));
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
    // Only KYC-approved drivers may accept orders.
    const driverProfile = await this.driverProfileRepository.findOne({
      where: { userId: driverId },
    });
    if (!driverProfile || driverProfile.kycStatus !== DriverKycStatus.APPROVED) {
      throw new ForbiddenException(
        'Your account must be verified before you can accept orders',
      );
    }

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

    // ATOMIC ACCEPT: only the first driver to acquire the Redis lock wins.
    // This eliminates the double-accept race entirely.
    const won = await this.dispatchService.acquireAcceptLock(orderId, driverId);
    if (!won) {
      throw new ConflictException('This order has already been taken by another driver');
    }

    try {
      // Re-read inside the lock and re-validate the order is still assignable.
      const fresh = await this.orderRepository.findOne({ where: { id: orderId } });
      if (
        !fresh ||
        (fresh.status !== OrderStatus.CREATED && fresh.status !== OrderStatus.DRIVER_ASSIGNED) ||
        (fresh.driverId && fresh.driverId !== driverId)
      ) {
        await this.dispatchService.releaseAcceptLock(orderId, driverId);
        throw new ConflictException('This order has already been taken by another driver');
      }

      fresh.driverId = driverId;
      fresh.vehicleId = vehicle.id;
      fresh.status = OrderStatus.ACCEPTED;
      fresh.acceptedAt = new Date();
      await this.orderRepository.save(fresh);
    } catch (error) {
      if (!(error instanceof ConflictException)) {
        await this.dispatchService.releaseAcceptLock(orderId, driverId);
      }
      throw error;
    }

    // Update driver availability
    await this.updateDriverAvailability(driverId, DriverAvailabilityStatus.ON_TRIP);

    // Create event
    await this.createOrderEvent(orderId, OrderEventType.DRIVER_ACCEPTED, 'Driver accepted the order', driverId);

    // Clear dispatch state (stops offer rollover, clears offered-set).
    await this.dispatchService.finalizeAssignment(orderId);

    const result = await this.getOrderById(orderId, driverId);

    // Notify the customer in real time that a driver accepted.
    this.realtime.emitToUser(order.customerId, REALTIME_EVENTS.ORDER_ACCEPTED, {
      orderId,
      order: result,
      driver: result.driver
        ? {
            id: result.driver.id,
            name: result.driver.name,
            phone: result.driver.phoneNumber || result.driver.phone,
          }
        : null,
    });
    this.realtime.emitToOrder(orderId, REALTIME_EVENTS.ORDER_STATUS, {
      orderId,
      status: OrderStatus.ACCEPTED,
    });

    return result;
  }

  async declineOrder(orderId: string, driverId: string, reason?: string) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.driverId === driverId) {
      // If driver was assigned, clear assignment so it can be re-dispatched.
      order.driverId = null;
      order.vehicleId = null;
      order.status = OrderStatus.CREATED;
      await this.orderRepository.save(order);
    }

    // Create event
    await this.createOrderEvent(
      orderId,
      OrderEventType.DRIVER_DECLINED,
      `Driver declined: ${reason || 'No reason provided'}`,
      driverId,
    );

    // Roll the dispatch to the next-nearest candidate driver.
    await this.dispatchService.onDriverDeclined(orderId, driverId);

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

    // Create event using a valid OrderEventType (the event enum does not have
    // 1:1 parity with OrderStatus, e.g. there is no EN_ROUTE_* event type).
    await this.createOrderEvent(
      orderId,
      this.statusToEventType(status),
      eventMessage,
      driverId,
    );

    const result = await this.getOrderById(orderId, driverId);

    // Broadcast the status change in real time to the customer + order room.
    this.emitOrderStatus(order.customerId, orderId, status, result);

    return result;
  }

  /** Map an OrderStatus to the closest valid OrderEventType for the audit log. */
  private statusToEventType(status: OrderStatus): OrderEventType {
    switch (status) {
      case OrderStatus.EN_ROUTE_TO_PICKUP:
        return OrderEventType.DRIVER_ACCEPTED;
      case OrderStatus.ARRIVED_AT_PICKUP:
        return OrderEventType.ARRIVED_AT_PICKUP;
      case OrderStatus.PICKED_UP:
        return OrderEventType.PICKED_UP;
      case OrderStatus.STARTED:
        return OrderEventType.STARTED;
      case OrderStatus.EN_ROUTE_TO_DROPOFF:
        return OrderEventType.STARTED;
      case OrderStatus.DELIVERED:
        return OrderEventType.DELIVERED;
      case OrderStatus.COMPLETED:
        return OrderEventType.COMPLETED;
      case OrderStatus.CANCELLED:
        return OrderEventType.CANCELLED;
      default:
        return OrderEventType.STARTED;
    }
  }

  /**
   * Emit a realtime status change. Emits both a specific lifecycle event (so
   * existing client listeners fire) and a generic order:status event.
   */
  private emitOrderStatus(
    customerId: string,
    orderId: string,
    status: OrderStatus,
    order: Order,
  ): void {
    const specific: Partial<Record<OrderStatus, string>> = {
      [OrderStatus.EN_ROUTE_TO_PICKUP]: REALTIME_EVENTS.ORDER_STARTED,
      [OrderStatus.ARRIVED_AT_PICKUP]: REALTIME_EVENTS.ORDER_ARRIVED,
      [OrderStatus.PICKED_UP]: REALTIME_EVENTS.ORDER_STARTED,
      [OrderStatus.STARTED]: REALTIME_EVENTS.ORDER_STARTED,
      [OrderStatus.EN_ROUTE_TO_DROPOFF]: REALTIME_EVENTS.ORDER_STARTED,
      [OrderStatus.DELIVERED]: REALTIME_EVENTS.ORDER_COMPLETED,
      [OrderStatus.COMPLETED]: REALTIME_EVENTS.ORDER_COMPLETED,
    };

    const payload = { orderId, status, order };
    const specificEvent = specific[status];
    if (specificEvent) {
      this.realtime.emitToUser(customerId, specificEvent, payload);
      this.realtime.emitToOrder(orderId, specificEvent, payload);
    }
    this.realtime.emitToUser(customerId, REALTIME_EVENTS.ORDER_STATUS, payload);
    this.realtime.emitToOrder(orderId, REALTIME_EVENTS.ORDER_STATUS, payload);
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

  /**
   * Dispatch scheduled orders that are now due.
   *
   * Runs every minute. A scheduled order is dispatched once its scheduledAt time
   * has passed, it has no driver yet, it is still in a dispatchable state, and
   * (for PREPAID orders) it has been paid. PAY_ON_DELIVERY scheduled orders are
   * dispatched without requiring payment.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchDueScheduledOrders() {
    const now = new Date();
    const dueOrders = await this.orderRepository.find({
      where: {
        isScheduled: true,
        scheduledAt: LessThanOrEqual(now),
        status: OrderStatus.CREATED,
      },
    });

    for (const order of dueOrders) {
      if (order.driverId) {
        continue;
      }
      // PREPAID scheduled orders must be paid before they go out.
      if (order.paymentMode === OrderPaymentMode.PREPAID && !order.isPaid) {
        continue;
      }

      // Mark it no longer "pending schedule" so it isn't picked up again, then
      // hand off to the dispatch engine.
      order.isScheduled = false;
      await this.orderRepository.save(order);

      this.dispatchService
        .dispatchOrder(order.id)
        .catch((err) =>
          console.error(`Scheduled dispatch failed for order ${order.id}: ${err.message}`),
        );
    }
  }
}
