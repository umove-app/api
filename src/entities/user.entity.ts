import { Entity, Column, Index, OneToOne, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../common/entities/base.entity';
import { UserRole, UserStatus } from '../common/enums';
import { DriverProfile } from './driver-profile.entity';
import { Order } from './order.entity';
import { Review } from './review.entity';
import { AppRating } from './app-rating.entity';
import { Notification } from './notification.entity';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['phone'])
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  firstName: string;

  @Column({ type: 'varchar', length: 255 })
  lastName: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
  })
  status: UserStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string;

  @Column({ type: 'varchar', length: 10, default: 'NGN' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  profilePicture: string;

  @Column({ type: 'text', nullable: true })
  defaultAddress: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  defaultLatitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  defaultLongitude: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  googleId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  appleId: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ type: 'boolean', default: false })
  phoneVerified: boolean;

  @Column({ type: 'boolean', default: false })
  isPhoneVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fcmToken: string;

  @Column({ type: 'jsonb', nullable: true })
  notificationPreferences: Record<string, any>;

  // Relations
  @OneToOne(() => DriverProfile, (profile) => profile.user)
  driverProfile: DriverProfile;

  @OneToMany(() => Order, (order) => order.customer)
  orders: Order[];

  @OneToMany(() => Order, (order) => order.driver)
  driverOrders: Order[];

  @OneToMany(() => Review, (review) => review.customer)
  givenReviews: Review[];

  @OneToMany(() => Review, (review) => review.driver)
  receivedReviews: Review[];

  @OneToMany(() => AppRating, (rating) => rating.user)
  appRatings: AppRating[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}
