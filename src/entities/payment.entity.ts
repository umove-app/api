import { Entity, Column, Index, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { PaymentProvider, PaymentStatus, PaymentMethod } from '../common/enums';
import { Order } from './order.entity';

@Entity('payments')
@Index(['orderId'], { unique: true })
@Index(['reference'])
@Index(['status'])
export class Payment extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  orderId: string;

  @Column({
    type: 'enum',
    enum: PaymentProvider,
  })
  provider: PaymentProvider;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
  })
  paymentMethod: PaymentMethod;

  @Column({ type: 'varchar', length: 255, unique: true })
  reference: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  providerReference: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'NGN' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  authorizationUrl: string | null;

  @Column({ type: 'text', nullable: true })
  accessCode: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  failedAt: Date;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ type: 'timestamp', nullable: true })
  refundedAt: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  refundAmount: number;

  @Column({ type: 'text', nullable: true })
  refundReason: string;

  @Column({ type: 'jsonb', nullable: true })
  providerResponse: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Relations
  @OneToOne(() => Order, (order) => order.payment, { eager: true })
  @JoinColumn({ name: 'orderId' })
  order: Order;
}
