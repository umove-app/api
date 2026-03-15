import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { DocumentType } from '../common/enums';
import { DriverProfile } from './driver-profile.entity';

@Entity('driver_documents')
export class DriverDocument extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  driverId: string;

  @Column({
    type: 'enum',
    enum: DocumentType,
  })
  documentType: DocumentType;

  @Column({ type: 'varchar', length: 255 })
  documentUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  documentNumber: string;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  verifiedBy: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Relations
  @ManyToOne(() => DriverProfile, (profile) => profile.documents)
  @JoinColumn({ name: 'driverId' })
  driver: DriverProfile;
}
