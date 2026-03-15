import { Entity, Column, Index, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { AdminRole } from '../common/enums';
import { User } from './user.entity';

@Entity('admin_profiles')
export class AdminProfile extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: AdminRole,
    default: AdminRole.ADMIN,
  })
  adminRole: AdminRole;

  @Column({ type: 'text', nullable: true })
  permissions: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  department: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  employeeId: string;

  @Column({ type: 'timestamp', nullable: true })
  assignedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  assignedBy: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Relations
  @OneToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;
}
