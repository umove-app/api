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

  // Holds presigned S3 URLs (with signature/credential query params), which can
  // exceed 1000 chars — use text rather than a length-capped varchar.
  @Column({ type: 'text' })
  documentUrl: string;

  // Stable S3 object key. Presigned URLs are generated from this on read so the
  // stored reference never expires (documentUrl is a convenience/last-signed value).
  @Column({ type: 'varchar', length: 512, nullable: true })
  documentKey: string;

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
