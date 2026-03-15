import { Entity, Column, Index, JoinColumn, OneToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { DriverKycStatus, DriverAvailabilityStatus } from '../common/enums';
import { User } from './user.entity';
import { Vehicle } from './vehicle.entity';
import { DriverDocument } from './driver-document.entity';

@Entity('driver_profiles')
export class DriverProfile extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: DriverKycStatus,
    default: DriverKycStatus.PENDING,
  })
  kycStatus: DriverKycStatus;

  @Column({
    type: 'enum',
    enum: DriverAvailabilityStatus,
    default: DriverAvailabilityStatus.OFFLINE,
  })
  availabilityStatus: DriverAvailabilityStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  licenseNumber: string;

  @Column({ type: 'date', nullable: true })
  licenseExpiryDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nationalIdNumber: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  zipCode: string;

  @Column({ type: 'text', nullable: true })
  emergencyContactName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  emergencyContactPhone: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ type: 'integer', default: 0 })
  totalTrips: number;

  @Column({ type: 'integer', default: 0 })
  completedTrips: number;

  @Column({ type: 'integer', default: 0 })
  cancelledTrips: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lastKnownLatitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lastKnownLongitude: number;

  @Column({ type: 'timestamp', nullable: true })
  lastLocationUpdate: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'timestamp', nullable: true })
  onlineAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  offlineAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Computed properties for backward compatibility
  get isOnline(): boolean {
    return this.availabilityStatus === DriverAvailabilityStatus.ONLINE;
  }

  get verificationStatus(): string {
    // Map kycStatus to verificationStatus
    switch (this.kycStatus) {
      case DriverKycStatus.APPROVED:
        return 'VERIFIED';
      case DriverKycStatus.REJECTED:
        return 'REJECTED';
      default:
        return 'PENDING';
    }
  }

  get vehicle(): Vehicle | undefined {
    return this.vehicles?.[0];
  }

  // Relations
  @OneToOne(() => User, (user) => user.driverProfile, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.driver)
  vehicles: Vehicle[];

  @OneToMany(() => DriverDocument, (document) => document.driver)
  documents: DriverDocument[];
}
