import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { RefreshToken } from './refresh-token';
import { ChatSession } from './chat-session';
import { UploadedFile } from './uploaded-file';
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'username', type: 'varchar', length: 50, unique: true })
  username: string;

  @Column({ name: 'email', type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'text', nullable: true })
  password_hash: string | null;

  @Column({ name: 'google_id', type: 'varchar', length: 255, nullable: true, unique: true })
  google_id: string | null;

  @Column({ name: 'full_name', type: 'varchar', length: 255, nullable: true })
  full_name: string;

  @Column({ name: 'role', type: 'varchar', length: 20, default: 'USER' })
  role: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  is_active: boolean;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  is_verified: boolean;

  @Column({ name: 'otp_code', type: 'varchar', length: 6, nullable: true })
  otp_code: string;

  @Column({ name: 'otp_expires_at', type: 'timestamp', nullable: true })
  otp_expires_at: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  // Relations
  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => ChatSession, (cs) => cs.user)
  chatSessions: ChatSession[];

  @OneToMany(() => UploadedFile, (file) => file.user)
  uploadedFiles: UploadedFile[];

}
