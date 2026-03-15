import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { OrderEventType } from '../common/enums';
import { Order } from './order.entity';

@Entity('order_events')
@Index(['orderId', 'createdAt'])
export class OrderEvent extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  orderId: string;

  @Column({
    type: 'enum',
    enum: OrderEventType,
  })
  eventType: OrderEventType;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'uuid', nullable: true })
  performedBy: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  performedByRole: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne(() => Order, (order) => order.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;
}
