import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { DriverProfile } from './driver-profile.entity';
import { Order } from './order.entity';

@Entity('vehicles')
@Index(['plateNumber'], { unique: true })
export class Vehicle extends BaseEntity {
  @Column({ type: 'uuid' })
  driverId: string;

  @Column({ type: 'varchar', length: 100 })
  type: string;

  @Column({ type: 'varchar', length: 100 })
  make: string;

  @Column({ type: 'varchar', length: 100 })
  model: string;

  @Column({ type: 'integer' })
  year: number;

  @Column({ type: 'varchar', length: 50 })
  color: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  plateNumber: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  capacity: number;

  @Column({ type: 'varchar', length: 20, default: 'kg' })
  capacityUnit: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  registrationDocument: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  insuranceDocument: string;

  @Column({ type: 'date', nullable: true })
  insuranceExpiryDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  roadworthinessDocument: string;

  @Column({ type: 'date', nullable: true })
  roadworthinessExpiryDate: Date;

  @Column({ type: 'text', array: true, default: '{}' })
  photos: string[];

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  verifiedBy: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne(() => DriverProfile, (profile) => profile.vehicles, { eager: true })
  @JoinColumn({ name: 'driverId' })
  driver: DriverProfile;

  @OneToMany(() => Order, (order) => order.vehicle)
  orders: Order[];
}
