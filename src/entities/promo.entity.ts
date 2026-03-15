import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';

export enum PromoType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
}

@Entity('promos')
@Index(['code'], { unique: true })
export class Promo extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PromoType,
    default: PromoType.PERCENTAGE,
  })
  type: PromoType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  value: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxDiscount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  minOrderAmount: number;

  @Column({ type: 'integer', nullable: true })
  maxUsage: number | null;

  @Column({ type: 'integer', default: 0 })
  currentUsage: number;

  @Column({ type: 'integer', default: 1 })
  maxUsagePerUser: number;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'text', array: true, default: [] })
  allowedCountries: string[];

  @Column({ type: 'text', array: true, default: [] })
  allowedVehicleTypes: string[];

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Computed properties for backward compatibility
  get isActive(): boolean {
    return this.active;
  }

  set isActive(value: boolean) {
    this.active = value;
  }

  get currentUsageCount(): number {
    return this.currentUsage;
  }

  set currentUsageCount(value: number) {
    this.currentUsage = value;
  }

  get maxUsageCount(): number | null {
    return this.maxUsage;
  }

  set maxUsageCount(value: number | null | undefined) {
    this.maxUsage = value ?? null;
  }

  get expiresAt(): Date {
    return this.endDate;
  }

  set expiresAt(value: Date) {
    this.endDate = value;
  }
}
