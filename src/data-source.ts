import 'reflect-metadata';
import { DataSource } from 'typeorm';
import config from '@/config';
import { User } from '@/models/user';
import { RefreshToken } from '@/models/refresh-token';
import { ChatSession } from '@/models/chat-session';
import { Message } from '@/models/message';
import { UploadedFile } from '@/models/uploaded-file';
import { OcrResult } from '@/models/ocr-result';
import { Document } from '@/models/document';
import { DocumentChunk } from '@/models/document-chunk';
import { ChatFeedback } from '@/models/chat-feedback';
import { ApiLog } from '@/models/api-log';
import { Notification } from '@/models/notification';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: process.env.NODE_ENV !== 'production',
  logging: false,
  entities: [
    User,
    RefreshToken,
    ChatSession,
    Message,
    UploadedFile,
    OcrResult,
    Document,
    DocumentChunk,
    ChatFeedback,
    ApiLog,
    Notification,
  ],
  migrations: ['src/migrations/*.ts'],
  migrationsRun: true,
  ssl: { rejectUnauthorized: false },
});
