import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Document } from './document';

@Entity('document_chunks')
export class DocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  document_id: string;

  @Column({ name: 'chunk_index', type: 'int' })
  chunk_index: number;

  @Column({ name: 'chunk_text', type: 'text' })
  chunk_text: string;

  @Column({ name: 'embedding_id', type: 'varchar', length: 255, nullable: true })
  embedding_id: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => Document, (doc) => doc.chunks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;
}
