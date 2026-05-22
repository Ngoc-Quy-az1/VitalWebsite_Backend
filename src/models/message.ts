import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ChatSession } from './chat-session';
import { ChatFeedback } from './chat-feedback';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  session_id: string;

  @Column({ name: 'sender_type', type: 'varchar', length: 20 })
  sender_type: string; // USER | BOT | ADMIN

  @Column({ name: 'message_type', type: 'varchar', length: 20, default: 'TEXT' })
  message_type: string; // TEXT | IMAGE | FILE

  @Column({ name: 'content', type: 'text', nullable: true })
  content: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => ChatSession, (session) => session.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: ChatSession;

  @OneToMany(() => ChatFeedback, (feedback) => feedback.message)
  feedbacks: ChatFeedback[];
}
