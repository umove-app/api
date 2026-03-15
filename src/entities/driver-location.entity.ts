import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { Order } from './order.entity';

@Entity('driver_locations')
@Index(['orderId', 'createdAt'])
@Index(['driverId', 'createdAt'])
export class DriverLocation extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  orderId: string;

  @Column({ type: 'uuid' })
  @Index()
  driverId: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  speed: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  heading: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  accuracy: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  capturedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne(() => Order, (order) => order.locations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;
}
