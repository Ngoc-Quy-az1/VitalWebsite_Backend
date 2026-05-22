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
import { UploadedFile } from './uploaded-file';
import { DocumentChunk } from './document-chunk';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  user_id: string;

  @Column({ name: 'source_file_id', type: 'uuid', nullable: true })
  source_file_id: string;

  @Column({ name: 'title', type: 'text', nullable: true })
  title: string;

  @Column({ name: 'document_type', type: 'varchar', length: 50, nullable: true })
  document_type: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => User, (user) => user.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => UploadedFile, (file) => file.documents, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_file_id' })
  sourceFile: UploadedFile;

  @OneToMany(() => DocumentChunk, (chunk) => chunk.document)
  chunks: DocumentChunk[];
}
