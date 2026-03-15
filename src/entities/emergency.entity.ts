import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { User } from './user.entity';

export enum EmergencyStatus {
    REPORTED = 'REPORTED',
    ACKNOWLEDGED = 'ACKNOWLEDGED',
    RESPONDING = 'RESPONDING',
    RESOLVED = 'RESOLVED',
    FALSE_ALARM = 'FALSE_ALARM',
}

export enum EmergencyType {
    ACCIDENT = 'ACCIDENT',
    VEHICLE_BREAKDOWN = 'VEHICLE_BREAKDOWN',
    MEDICAL = 'MEDICAL',
    SECURITY_THREAT = 'SECURITY_THREAT',
    HARASSMENT = 'HARASSMENT',
    ROBBERY = 'ROBBERY',
    OTHER = 'OTHER',
}

@Entity('emergencies')
@Index(['userId'])
@Index(['status'])
@Index(['createdAt'])
export class Emergency extends BaseEntity {
    @Column({ type: 'uuid' })
    userId: string;

    @Column({
        type: 'enum',
        enum: EmergencyType,
        default: EmergencyType.OTHER,
    })
    type: EmergencyType;

    @Column({
        type: 'enum',
        enum: EmergencyStatus,
        default: EmergencyStatus.REPORTED,
    })
    status: EmergencyStatus;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
    latitude: number;

    @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
    longitude: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    address: string;

    @Column({ type: 'uuid', nullable: true })
    orderId: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    userRole: string; // 'CUSTOMER' or 'DRIVER'

    @Column({ type: 'varchar', length: 50, nullable: true })
    platform: string; // 'android', 'ios', 'web'

    @Column({ type: 'text', nullable: true })
    adminNotes: string;

    @Column({ type: 'uuid', nullable: true })
    handledByAdminId: string;

    @Column({ type: 'timestamp', nullable: true })
    acknowledgedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    resolvedAt: Date;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    // Relations
    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'handledByAdminId' })
    handledByAdmin: User;
}
