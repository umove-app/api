import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { OrderStatus, OrderType } from '../common/enums';
import { User } from './user.entity';
import { Vehicle } from './vehicle.entity';
import { VehicleType } from './vehicle-type.entity';
import { OrderEvent } from './order-event.entity';
import { Payment } from './payment.entity';
import { DriverLocation } from './driver-location.entity';
import { Review } from './review.entity';

@Entity('orders')
@Index(['customerId'])
@Index(['driverId'])
@Index(['status'])
@Index(['createdAt'])
export class Order extends BaseEntity {
  @Column({ type: 'uuid' })
  customerId: string;

  @Column({ type: 'uuid', nullable: true })
  driverId: string | null;

  @Column({ type: 'uuid', nullable: true })
  vehicleId: string | null;

  @Column({ type: 'uuid', nullable: true })
  vehicleTypeId: string | null;

  @Column({
    type: 'enum',
    enum: OrderType,
    default: OrderType.MOVE_TRANSPORT,
  })
  orderType: OrderType;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.CREATED,
  })
  status: OrderStatus;

  // Pickup details
  @Column({ type: 'text' })
  pickupAddress: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  pickupLatitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  pickupLongitude: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  pickupPhone: string;

  @Column({ type: 'text', nullable: true })
  pickupNotes: string;

  // Destination details
  @Column({ type: 'text' })
  destinationAddress: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  destinationLatitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  destinationLongitude: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  destinationPhone: string;

  @Column({ type: 'text', nullable: true })
  destinationNotes: string;

  // Scheduling
  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'boolean', default: false })
  isScheduled: boolean;

  // Trip details
  @Column({ type: 'varchar', length: 100 })
  vehicleType: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedDistance: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  actualDistance: number;

  @Column({ type: 'varchar', length: 10, default: 'km' })
  distanceUnit: string;

  @Column({ type: 'integer', nullable: true })
  estimatedDuration: number;

  @Column({ type: 'integer', nullable: true })
  actualDuration: number;

  // Pricing
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  vat: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0 })
  vatRate: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  promoCode: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ type: 'varchar', length: 10, default: 'NGN' })
  currency: string;

  // Timestamps
  @Column({ type: 'timestamp', nullable: true })
  assignedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  arrivedAtPickupAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  pickedUpAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  arrivedAtDestinationAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'uuid', nullable: true })
  cancelledBy: string;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne(() => User, (user) => user.orders, { eager: true })
  @JoinColumn({ name: 'customerId' })
  customer: User;

  @ManyToOne(() => User, (user) => user.driverOrders, { eager: true })
  @JoinColumn({ name: 'driverId' })
  driver: User;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.orders)
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

  @ManyToOne(() => VehicleType)
  @JoinColumn({ name: 'vehicleTypeId' })
  vehicleTypeEntity: VehicleType;

  @OneToMany(() => OrderEvent, (event) => event.order, { cascade: true })
  events: OrderEvent[];

  @OneToOne(() => Payment, (payment) => payment.order)
  payment: Payment;

  @OneToMany(() => DriverLocation, (location) => location.order, { cascade: true })
  locations: DriverLocation[];

  @OneToOne(() => Review, (review) => review.order)
  review: Review;
}
