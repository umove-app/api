import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { DriverProfile } from '../../entities/driver-profile.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { RedisService } from '../../config/redis.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { REALTIME_EVENTS } from '../realtime/realtime.events';
import {
  OrderStatus,
  DriverAvailabilityStatus,
  DriverKycStatus,
} from '../../common/enums';
import { DISPATCH } from './dispatch.constants';

interface CandidateDriver {
  userId: string;
  distanceKm: number;
}

/**
 * Redis-backed dispatch engine.
 *
 * Responsibilities:
 *  - Find eligible drivers using an EXPANDING search radius (3 -> 6 -> 10 -> 15 km).
 *  - Offer an order to one driver at a time, each with a bounded timeout; on
 *    decline/timeout it rolls to the next nearest candidate.
 *  - Guarantee that only ONE driver can accept an order (atomic Redis lock),
 *    eliminating the double-accept race.
 *  - Broadcast offers / outcomes over the realtime gateway.
 *
 * The engine is deliberately stateless across instances: all transient
 * dispatch state (current offer, offered-set, accept lock) lives in Redis with
 * TTLs, so it is safe under multiple API instances and survives restarts.
 */
@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);
  /** In-process timers for offer expiry (best-effort; Redis TTL is the source of truth). */
  private readonly offerTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepository: Repository<DriverProfile>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    private readonly redis: RedisService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /**
   * Begin (or restart) dispatch for an order. Safe to call repeatedly; it picks
   * up the next un-offered candidate. Returns immediately; offers proceed
   * asynchronously driven by timeouts.
   */
  async dispatchOrder(orderId: string): Promise<void> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      this.logger.warn(`dispatchOrder: order ${orderId} not found`);
      return;
    }

    if (!this.isDispatchable(order.status)) {
      this.logger.log(`dispatchOrder: order ${orderId} not dispatchable (status ${order.status})`);
      return;
    }

    await this.offerNext(orderId);
  }

  /**
   * Attempt to acquire the exclusive accept lock for an order on behalf of a
   * driver. Returns true ONLY for the single winning driver. This is the
   * atomic guard that prevents double-accept.
   */
  async acquireAcceptLock(orderId: string, driverId: string): Promise<boolean> {
    // If there is a current outstanding offer, only the offered driver may win.
    const currentOffer = await this.redis.get(DISPATCH.KEYS.currentOffer(orderId));
    if (currentOffer && currentOffer !== driverId) {
      return false;
    }

    const acquired = await this.redis.setIfNotExists(
      DISPATCH.KEYS.acceptLock(orderId),
      driverId,
      DISPATCH.ACCEPT_LOCK_TTL_SECONDS,
    );
    return acquired;
  }

  /** Release the accept lock if held by this driver (used on accept failure/rollback). */
  async releaseAcceptLock(orderId: string, driverId: string): Promise<void> {
    await this.redis.delIfValueMatches(DISPATCH.KEYS.acceptLock(orderId), driverId);
  }

  /**
   * Finalize a successful accept: clear all transient dispatch state and stop
   * any pending offer timer. Called after the order is persisted as ACCEPTED.
   */
  async finalizeAssignment(orderId: string): Promise<void> {
    this.clearTimer(orderId);
    await Promise.all([
      this.redis.del(DISPATCH.KEYS.currentOffer(orderId)),
      this.redis.del(DISPATCH.KEYS.offeredSet(orderId)),
    ]);
    // Intentionally leave the accept lock to expire on its own TTL so any
    // in-flight concurrent accept attempts still see it as taken.
  }

  /**
   * A driver declined (or their offer timed out). Roll to the next candidate.
   */
  async onDriverDeclined(orderId: string, driverId: string): Promise<void> {
    const currentOffer = await this.redis.get(DISPATCH.KEYS.currentOffer(orderId));
    if (currentOffer === driverId) {
      await this.redis.del(DISPATCH.KEYS.currentOffer(orderId));
      this.realtime.emitToDriver(driverId, REALTIME_EVENTS.ORDER_OFFER_EXPIRED, { orderId });
    }
    await this.offerNext(orderId);
  }

  /** Cancel dispatch entirely (e.g. customer cancelled the order). */
  async cancelDispatch(orderId: string): Promise<void> {
    this.clearTimer(orderId);
    await Promise.all([
      this.redis.del(DISPATCH.KEYS.currentOffer(orderId)),
      this.redis.del(DISPATCH.KEYS.offeredSet(orderId)),
      this.redis.del(DISPATCH.KEYS.acceptLock(orderId)),
    ]);
  }

  // ==================== Internal ====================

  private isDispatchable(status: OrderStatus): boolean {
    return [OrderStatus.CREATED, OrderStatus.PENDING, OrderStatus.DRIVER_ASSIGNED].includes(status);
  }

  /**
   * Offer the order to the next-nearest eligible driver who has not yet been
   * offered it. If none remain (or the offer cap is hit), notify the customer.
   */
  private async offerNext(orderId: string): Promise<void> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order || !this.isDispatchable(order.status)) {
      this.clearTimer(orderId);
      return;
    }

    // If an offer is already outstanding, do nothing (its timer will roll over).
    const outstanding = await this.redis.get(DISPATCH.KEYS.currentOffer(orderId));
    if (outstanding) {
      return;
    }

    const offered = await this.redis.setMembers(DISPATCH.KEYS.offeredSet(orderId));
    if (offered.length >= DISPATCH.MAX_OFFERS) {
      await this.exhaust(orderId);
      return;
    }

    const candidate = await this.findNextCandidate(order, offered);
    if (!candidate) {
      await this.exhaust(orderId);
      return;
    }

    // Mark as offered and set the current outstanding offer with TTL.
    await this.redis.addToSet(
      DISPATCH.KEYS.offeredSet(orderId),
      candidate.userId,
      DISPATCH.OFFER_TTL_SECONDS * (DISPATCH.MAX_OFFERS + 2),
    );
    await this.redis.set(
      DISPATCH.KEYS.currentOffer(orderId),
      candidate.userId,
      DISPATCH.OFFER_TTL_SECONDS,
    );

    this.logger.log(
      `Offering order ${orderId} to driver ${candidate.userId} (${candidate.distanceKm.toFixed(
        1,
      )}km)`,
    );

    // Push the offer to the driver in real time.
    this.realtime.emitToDriver(candidate.userId, REALTIME_EVENTS.ORDER_OFFER, {
      orderId,
      pickupAddress: order.pickupAddress,
      pickupLatitude: Number(order.pickupLatitude),
      pickupLongitude: Number(order.pickupLongitude),
      destinationAddress: order.destinationAddress,
      total: Number(order.total),
      currency: order.currency,
      estimatedDistance: order.estimatedDistance ? Number(order.estimatedDistance) : null,
      estimatedDuration: order.estimatedDuration ?? null,
      expiresInSeconds: DISPATCH.OFFER_TTL_SECONDS,
    });

    // Schedule rollover when this offer expires.
    this.scheduleExpiry(orderId, candidate.userId);
  }

  /**
   * Find the nearest eligible driver not yet offered this order, using the
   * smallest radius tier that yields a candidate (expanding search).
   */
  private async findNextCandidate(
    order: Order,
    excludeDriverIds: string[],
  ): Promise<CandidateDriver | null> {
    for (const radiusKm of DISPATCH.RADIUS_TIERS_KM) {
      const candidate = await this.queryNearestDriver(order, radiusKm, excludeDriverIds);
      if (candidate) {
        return candidate;
      }
    }
    return null;
  }

  private async queryNearestDriver(
    order: Order,
    radiusKm: number,
    excludeDriverIds: string[],
  ): Promise<CandidateDriver | null> {
    // Haversine distance expression (km). Repeated in WHERE because Postgres
    // cannot reference a SELECT alias in WHERE/HAVING without GROUP BY.
    const distanceExpr =
      '(6371 * acos(LEAST(1, cos(radians(:lat)) * cos(radians(dp.lastKnownLatitude)) * cos(radians(dp.lastKnownLongitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(dp.lastKnownLatitude)))))';

    const qb = this.driverProfileRepository
      .createQueryBuilder('dp')
      .select('dp.userId', 'userId')
      .addSelect(distanceExpr, 'distance')
      .where('dp.availabilityStatus = :status', {
        status: DriverAvailabilityStatus.ONLINE,
      })
      .andWhere('dp.kycStatus = :kyc', { kyc: DriverKycStatus.APPROVED })
      .andWhere('dp.lastKnownLatitude IS NOT NULL')
      .andWhere('dp.lastKnownLongitude IS NOT NULL')
      .andWhere(`${distanceExpr} <= :radius`, { radius: radiusKm })
      .setParameters({
        lat: order.pickupLatitude,
        lng: order.pickupLongitude,
      });

    if (excludeDriverIds.length > 0) {
      qb.andWhere('dp.userId NOT IN (:...excluded)', { excluded: excludeDriverIds });
    }

    const rows = await qb
      .orderBy('distance', 'ASC')
      .limit(10)
      .getRawMany<{ userId: string; distance: string }>();

    // Pick the nearest candidate that also has a matching, verified, active vehicle.
    for (const row of rows) {
      const hasVehicle = await this.driverHasMatchingVehicle(row.userId, order.vehicleType);
      if (hasVehicle) {
        return { userId: row.userId, distanceKm: Number(row.distance) };
      }
    }
    return null;
  }

  private async driverHasMatchingVehicle(driverId: string, vehicleType: string): Promise<boolean> {
    const count = await this.vehicleRepository.count({
      where: {
        driver: { userId: driverId },
        type: vehicleType,
        active: true,
        verified: true,
      },
    });
    return count > 0;
  }

  private async exhaust(orderId: string): Promise<void> {
    this.clearTimer(orderId);
    await this.redis.del(DISPATCH.KEYS.currentOffer(orderId));

    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (order && this.isDispatchable(order.status)) {
      this.logger.warn(`Dispatch exhausted for order ${orderId}: no drivers available`);
      this.realtime.emitToUser(order.customerId, REALTIME_EVENTS.ORDER_NO_DRIVERS, {
        orderId,
        message: 'No drivers are available right now. Please try again shortly.',
      });
    }
  }

  private scheduleExpiry(orderId: string, driverId: string): void {
    this.clearTimer(orderId);
    const timer = setTimeout(async () => {
      try {
        const current = await this.redis.get(DISPATCH.KEYS.currentOffer(orderId));
        // Only roll over if this driver's offer is still the outstanding one.
        if (current === driverId) {
          this.logger.log(`Offer to driver ${driverId} for order ${orderId} timed out`);
          await this.redis.del(DISPATCH.KEYS.currentOffer(orderId));
          this.realtime.emitToDriver(driverId, REALTIME_EVENTS.ORDER_OFFER_EXPIRED, { orderId });
          await this.offerNext(orderId);
        }
      } catch (err) {
        this.logger.error(`Offer expiry handler failed for order ${orderId}`, err as any);
      }
    }, DISPATCH.OFFER_TTL_SECONDS * 1000);

    // Prevent the timer from keeping the process alive unnecessarily.
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
    this.offerTimers.set(orderId, timer);
  }

  private clearTimer(orderId: string): void {
    const timer = this.offerTimers.get(orderId);
    if (timer) {
      clearTimeout(timer);
      this.offerTimers.delete(orderId);
    }
  }
}
