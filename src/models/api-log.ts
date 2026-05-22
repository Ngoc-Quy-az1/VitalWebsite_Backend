import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user';

@Entity('api_logs')
export class ApiLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  user_id: string;

  @Column({ name: 'endpoint', type: 'text', nullable: true })
  endpoint: string;

  @Column({ name: 'request_tokens', type: 'int', default: 0 })
  request_tokens: number;

  @Column({ name: 'response_tokens', type: 'int', default: 0 })
  response_tokens: number;

  @Column({ name: 'latency_ms', type: 'int', nullable: true })
  latency_ms: number;

  @Column({ name: 'status_code', type: 'int', nullable: true })
  status_code: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => User, (user) => user.apiLogs, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
