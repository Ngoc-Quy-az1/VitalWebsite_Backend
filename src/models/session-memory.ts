import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { User } from './user';
import { ChatSession } from './chat-session';
import { Message } from './message';

@Entity('session_memories')
export class SessionMemory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  user_id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  session_id: string;

  @Column({ name: 'memory_summary', type: 'text', nullable: true })
  memory_summary: string;

  @Column({ name: 'key_facts', type: 'jsonb', nullable: true })
  key_facts: any;

  @Column({ name: 'last_message_id', type: 'uuid', nullable: true })
  last_message_id: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => ChatSession, (session) => session.memories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: ChatSession;

  @ManyToOne(() => Message, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'last_message_id' })
  lastMessage: Message;
}
