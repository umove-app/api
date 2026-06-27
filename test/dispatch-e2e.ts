/**
 * End-to-end smoke test for the dispatch engine + order lifecycle + payment.
 *
 * Boots the real Nest application (against an ISOLATED test Postgres/Redis via
 * .env.e2e), seeds dummy data, and exercises:
 *   1. Order creation -> dispatch offer (Redis offer state set)
 *   2. Concurrent accept -> exactly ONE driver wins (atomic lock)
 *   3. Status transitions through to COMPLETED
 *   4. Payment initiation record
 *
 * Run: npm run test:dispatch  (see package.json)
 */
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/entities/user.entity';
import { DriverProfile } from '../src/entities/driver-profile.entity';
import { Vehicle } from '../src/entities/vehicle.entity';
import { VehicleType } from '../src/entities/vehicle-type.entity';
import { OrdersService } from '../src/modules/orders/orders.service';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { DispatchService } from '../src/modules/dispatch/dispatch.service';
import { RedisService } from '../src/config/redis.service';
import {
  UserRole,
  UserStatus,
  DriverKycStatus,
  DriverAvailabilityStatus,
  OrderType,
  OrderStatus,
} from '../src/common/enums';
import { DISPATCH } from '../src/modules/dispatch/dispatch.constants';

const log = (msg: string) => console.log(`\n[E2E] ${msg}`);
let failures = 0;
function assert(cond: boolean, label: string) {
  if (cond) {
    console.log(`  PASS: ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL: ${label}`);
  }
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });

  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  const profileRepo = app.get<Repository<DriverProfile>>(getRepositoryToken(DriverProfile));
  const vehicleRepo = app.get<Repository<Vehicle>>(getRepositoryToken(Vehicle));
  const vehicleTypeRepo = app.get<Repository<VehicleType>>(getRepositoryToken(VehicleType));
  const orders = app.get(OrdersService);
  const dispatch = app.get(DispatchService);
  const redis = app.get(RedisService);

  // Clear any leftover dispatch state from previous runs so offers/locks start clean.
  await redis.flushDb();

  // Isolate this run: take every existing driver profile OFFLINE so dispatch can
  // only consider the two drivers we are about to seed (prior test drivers from
  // earlier runs share the same coordinates and would otherwise be picked).
  await profileRepo
    .createQueryBuilder()
    .update(DriverProfile)
    .set({ availabilityStatus: DriverAvailabilityStatus.OFFLINE })
    .execute();

  const stamp = Date.now();
  const vehicleType = 'Sedan';

  // ---- Seed vehicle type (pricing looks this up by name) ----
  const existingType = await vehicleTypeRepo.findOne({ where: { name: vehicleType } });
  if (!existingType) {
    await vehicleTypeRepo.save({
      name: vehicleType,
      description: 'E2E test sedan',
      baseFare: 500,
      perKmRate: 100,
      perMinuteRate: 10,
      minimumFare: 700,
      maxCapacity: 4,
      capacityUnit: 'persons',
      currency: 'NGN',
      active: true,
    } as any);
  }

  // ---- Seed customer ----
  const customer = (await userRepo.save({
    name: 'Test Customer',
    firstName: 'Test',
    lastName: 'Customer',
    email: `cust_${stamp}@e2e.local`,
    phone: `+234900${stamp.toString().slice(-7)}`,
    phoneNumber: `+234900${stamp.toString().slice(-7)}`,
    role: UserRole.CUSTOMER,
    status: UserStatus.ACTIVE,
    country: 'Nigeria',
    currency: 'NGN',
  } as any)) as User;

  // ---- Seed two drivers near pickup, both APPROVED + ONLINE + matching vehicle ----
  const pickupLat = 6.5244;
  const pickupLng = 3.3792;

  async function seedDriver(idx: number): Promise<User> {
    const driver = (await userRepo.save({
      name: `Test Driver ${idx}`,
      firstName: 'Driver',
      lastName: `${idx}`,
      email: `drv_${idx}_${stamp}@e2e.local`,
      phone: `+234811${stamp.toString().slice(-6)}${idx}`,
      phoneNumber: `+234811${stamp.toString().slice(-6)}${idx}`,
      role: UserRole.DRIVER,
      status: UserStatus.ACTIVE,
      country: 'Nigeria',
      currency: 'NGN',
    } as any)) as User;
    const profile = (await profileRepo.save({
      userId: driver.id,
      kycStatus: DriverKycStatus.APPROVED,
      availabilityStatus: DriverAvailabilityStatus.ONLINE,
      lastKnownLatitude: pickupLat + idx * 0.001,
      lastKnownLongitude: pickupLng + idx * 0.001,
      lastLocationUpdate: new Date(),
    } as any)) as DriverProfile;
    await vehicleRepo.save({
      // vehicles.driverId is a FK to driver_profiles.id (not users.id).
      driverId: profile.id,
      type: vehicleType,
      make: 'Toyota',
      model: 'Corolla',
      year: 2020,
      color: 'Black',
      plateNumber: `E2E-${idx}-${stamp.toString().slice(-5)}`,
      capacity: 4,
      capacityUnit: 'persons',
      active: true,
      verified: true,
    } as any);
    return driver;
  }

  const driverA = await seedDriver(1);
  const driverB = await seedDriver(2);
  log(`Seeded customer ${customer.id}, drivers ${driverA.id} / ${driverB.id}`);

  // ---- 1. Create order -> dispatch should offer it ----
  log('Creating order...');
  const order = await orders.createOrder(customer.id, {
    orderType: OrderType.PASSENGER,
    pickupAddress: '12 Pickup St, Lagos',
    pickupLatitude: pickupLat,
    pickupLongitude: pickupLng,
    destinationAddress: '34 Dropoff Ave, Lagos',
    destinationLatitude: 6.6018,
    destinationLongitude: 3.3515,
    vehicleType,
  } as any);
  assert(!!order?.id, 'order created');
  assert(order.status === OrderStatus.CREATED, `order status CREATED (got ${order.status})`);

  // Give the async dispatch a moment to place an offer.
  await new Promise((r) => setTimeout(r, 500));
  const offered = await redis.get(DISPATCH.KEYS.currentOffer(order.id));
  assert(!!offered, `dispatch placed an offer (offered driver: ${offered})`);
  assert(
    offered === driverA.id || offered === driverB.id,
    'offered driver is one of the seeded drivers',
  );

  // ---- 2. Concurrent accept -> exactly one wins ----
  log('Two drivers attempt to accept concurrently...');
  const results = await Promise.allSettled([
    orders.acceptOrder(order.id, driverA.id),
    orders.acceptOrder(order.id, driverB.id),
  ]);
  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');
  assert(fulfilled.length === 1, `exactly ONE accept succeeded (got ${fulfilled.length})`);
  assert(rejected.length === 1, `exactly ONE accept rejected (got ${rejected.length})`);

  const winner = (fulfilled[0] as PromiseFulfilledResult<any>).value;
  assert(winner.status === OrderStatus.ACCEPTED, `winning order is ACCEPTED (got ${winner.status})`);
  const winningDriverId = winner.driverId;
  assert(!!winningDriverId, `winning order has a driver (${winningDriverId})`);

  // ---- 3. Status transitions through completion ----
  log('Walking status transitions...');
  const transitions = [
    OrderStatus.EN_ROUTE_TO_PICKUP,
    OrderStatus.ARRIVED_AT_PICKUP,
    OrderStatus.PICKED_UP,
    OrderStatus.EN_ROUTE_TO_DROPOFF,
    OrderStatus.COMPLETED,
  ];
  let lastStatus = winner.status;
  for (const s of transitions) {
    const updated = await orders.updateOrderStatus(order.id, winningDriverId, s);
    lastStatus = updated.status;
  }
  assert(lastStatus === OrderStatus.COMPLETED, `order reached COMPLETED (got ${lastStatus})`);

  // ---- 4. Accept lock cleared appropriately; a late accept must fail ----
  log('Late accept attempt on completed order...');
  let lateAcceptFailed = false;
  try {
    await orders.acceptOrder(order.id, driverB.id);
  } catch {
    lateAcceptFailed = true;
  }
  assert(lateAcceptFailed, 'accepting an already-completed order is rejected');

  // ---- 5. Post-ride payment initiation ----
  // The payment record + reference are created and the external gateway is
  // called. With valid Paystack/Stripe sandbox credentials this returns an
  // authorization URL; without them the external HTTP call fails AFTER all
  // order/authorization/amount wiring has been validated. We assert the flow
  // gets through that wiring (i.e. it does not fail for an auth/ownership/order
  // reason) by checking the failure, if any, is only the external gateway call.
  log('Initiating payment for the completed order...');
  const payments = app.get(PaymentsService);
  try {
    const init = await payments.initiatePayment(customer.id, order.id);
    assert(!!init?.reference, `payment initiated with reference (${init?.reference})`);
    assert(Number(init.amount) === Number(winner.total), 'payment amount matches order total');
  } catch (err: any) {
    const msg = err?.message || '';
    const isExternalGatewayFailure =
      msg.includes('Failed to initialize Paystack payment') ||
      msg.includes('Failed to initialize Stripe payment');
    assert(
      isExternalGatewayFailure,
      `payment wiring reached the external gateway (only the external call failed: "${msg}")`,
    );
  }

  await app.close();

  log(failures === 0 ? 'ALL CHECKS PASSED ✅' : `${failures} CHECK(S) FAILED ❌`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('E2E run crashed:', err);
  process.exit(1);
});
