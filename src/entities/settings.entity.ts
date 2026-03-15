import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';

@Entity('settings')
export class Settings extends BaseEntity {
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 7.5 })
  vatPercentage: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 500 })
  minimumFare: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10 })
  cancellationFeePercentage: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 20 })
  driverCommissionPercentage: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 10 })
  maxSearchRadius: number;

  @Column({ type: 'integer', default: 300 })
  driverAcceptanceTimeout: number;

  @Column({ type: 'boolean', default: true })
  autoAssignDriver: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  supportEmail: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  supportPhone: string;

  @Column({ type: 'text', nullable: true })
  supportAddress: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  companyName: string;

  @Column({ type: 'text', nullable: true })
  companyAddress: string;
}
