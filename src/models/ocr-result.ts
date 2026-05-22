import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UploadedFile } from './uploaded-file';

@Entity('ocr_results')
export class OcrResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'file_id', type: 'uuid' })
  file_id: string;

  @Column({ name: 'extracted_text', type: 'text' })
  extracted_text: string;

  @Column({ name: 'language', type: 'varchar', length: 20, nullable: true })
  language: string;

  @Column({ name: 'processing_status', type: 'varchar', length: 20, default: 'SUCCESS' })
  processing_status: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => UploadedFile, (file) => file.ocrResults, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: UploadedFile;
}
