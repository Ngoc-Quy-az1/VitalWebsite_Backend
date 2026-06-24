import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user';
import { ChatSession } from './chat-session';

@Entity('uploaded_files')
export class UploadedFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  user_id: string;

  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  session_id: string;

  @Column({ name: 'original_filename', type: 'text' })
  original_filename: string;

  @Column({ name: 'stored_filename', type: 'text' })
  stored_filename: string;

  @Column({ name: 'file_path', type: 'text' })
  file_path: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mime_type: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  file_size: number;

  @Column({ name: 'upload_type', type: 'varchar', length: 20, nullable: true })
  upload_type: string; // IMAGE | PDF | DOCX

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => User, (user) => user.uploadedFiles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => ChatSession, (session) => session.uploadedFiles, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'session_id' })
  session: ChatSession;
}
