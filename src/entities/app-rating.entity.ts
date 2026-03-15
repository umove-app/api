import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../common/entities/base.entity';
import { User } from './user.entity';

@Entity('app_ratings')
@Index(['userId'])
export class AppRating extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'integer' })
  rating: number; // 1-5 stars

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'integer', nullable: true })
  easeOfUse: number; // 1-5

  @Column({ type: 'integer', nullable: true })
  features: number; // 1-5

  @Column({ type: 'integer', nullable: true })
  performance: number; // 1-5

  @Column({ type: 'integer', nullable: true })
  design: number; // 1-5

  @Column({ type: 'varchar', length: 50 })
  platform: string; // 'android', 'ios', 'web'

  @Column({ type: 'varchar', length: 20, nullable: true })
  appVersion: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  deviceModel: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne(() => User, (user) => user.appRatings)
  @JoinColumn({ name: 'userId' })
  user: User;
}
