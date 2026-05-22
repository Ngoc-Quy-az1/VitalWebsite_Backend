import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Message } from './message';

@Entity('chat_feedback')
export class ChatFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'message_id', type: 'uuid' })
  message_id: string;

  @Column({ name: 'rating', type: 'int', nullable: true })
  rating: number;

  @Column({ name: 'feedback_text', type: 'text', nullable: true })
  feedback_text: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => Message, (msg) => msg.feedbacks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message: Message;
}
