import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { User } from './user.entity';

export enum NotificationType {
  ORDER_CREATED = 'ORDER_CREATED',
  DRIVER_ASSIGNED = 'DRIVER_ASSIGNED',
  DRIVER_ARRIVED = 'DRIVER_ARRIVED',
  ORDER_STARTED = 'ORDER_STARTED',
  ORDER_COMPLETED = 'ORDER_COMPLETED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  KYC_APPROVED = 'KYC_APPROVED',
  KYC_REJECTED = 'KYC_REJECTED',
  PROMO_AVAILABLE = 'PROMO_AVAILABLE',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
  CUSTOM = 'CUSTOM',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  READ = 'READ',
}

@Entity('notifications')
@Index(['userId', 'createdAt'])
@Index(['status'])
export class Notification extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  audienceGroup: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.CUSTOM,
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'text', nullable: true })
  imageUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  // Relations
  @ManyToOne(() => User, (user) => user.notifications)
  @JoinColumn({ name: 'userId' })
  user: User;
}
