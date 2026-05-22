import { Container } from 'typedi';
import LoggerInstance from './logger';
import config from '@/config';
import { DataSource, Repository } from 'typeorm';
import { User } from '@/models/user';
import { RefreshToken } from '@/models/refresh-token';
import { ChatSession } from '@/models/chat-session';
import { Message } from '@/models/message';
import { UploadedFile } from '@/models/uploaded-file';
import { OcrResult } from '@/models/ocr-result';
import { Document } from '@/models/document';

export default ({ appDataSource }: { appDataSource: DataSource }) => {
  try {
    // Register TypeORM repositories
    Container.set('userRepository', appDataSource.getRepository(User));
    Container.set('refreshTokenRepository', appDataSource.getRepository(RefreshToken));
    Container.set('chatSessionRepository', appDataSource.getRepository(ChatSession));
    Container.set('messageRepository', appDataSource.getRepository(Message));
    Container.set('uploadedFileRepository', appDataSource.getRepository(UploadedFile));
    Container.set('ocrResultRepository', appDataSource.getRepository(OcrResult));
    Container.set('documentRepository', appDataSource.getRepository(Document));

    Container.set('logger', LoggerInstance);
    Container.set('appDataSource', appDataSource);

    LoggerInstance.info('✌️ Dependency injection configured');

    return { appDataSource };
  } catch (e) {
    LoggerInstance.error('🔥 Error on dependency injector loader: %o', e);
    throw e;
  }
};
