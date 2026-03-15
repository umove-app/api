import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';

@Entity('vehicle_types')
@Index(['name'], { unique: true })
export class VehicleType extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  icon: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  baseFare: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  perKmRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  perMinuteRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minimumFare: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  maxCapacity: number;

  @Column({ type: 'varchar', length: 20, default: 'kg' })
  capacityUnit: string;

  @Column({ type: 'varchar', length: 10, default: 'NGN' })
  currency: string;

  @Column({ type: 'text', array: true, default: [] })
  availableCountries: string[];

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
