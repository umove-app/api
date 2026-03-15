import { Entity, Column, Index, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { User } from './user.entity';
import { Order } from './order.entity';

@Entity('reviews')
@Index(['orderId'], { unique: true })
@Index(['driverId'])
@Index(['customerId'])
export class Review extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  orderId: string;

  @Column({ type: 'uuid' })
  customerId: string;

  @Column({ type: 'uuid' })
  driverId: string;

  @Column({ type: 'integer', default: 5 })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'integer', nullable: true })
  driverProfessionalism: number;

  @Column({ type: 'integer', nullable: true })
  vehicleCondition: number;

  @Column({ type: 'integer', nullable: true })
  punctuality: number;

  @Column({ type: 'integer', nullable: true })
  communication: number;

  @Column({ type: 'boolean', default: false })
  flagged: boolean;

  @Column({ type: 'text', nullable: true })
  flagReason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Relations
  @OneToOne(() => Order, (order) => order.review, { eager: true })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => User, (user) => user.givenReviews)
  @JoinColumn({ name: 'customerId' })
  customer: User;

  @ManyToOne(() => User, (user) => user.receivedReviews)
  @JoinColumn({ name: 'driverId' })
  driver: User;
}
