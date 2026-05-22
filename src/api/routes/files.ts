import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import middlewares from '../middlewares';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import multer from 'multer';

import { UploadedFile } from '@/models/uploaded-file';

const route = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Configure Cloudinary from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default (app: Router) => {
  app.use('/files', route);

  // Save an image link (already uploaded elsewhere) into uploaded_files
  route.post(
    '/image-link',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { original_filename, file_path, session_id } = req.body;
        if (!original_filename || !file_path) {
          return res.status(422).json({ message: 'original_filename and file_path are required' });
        }

        const appDataSource = Container.get('appDataSource');
        const repo = appDataSource.getRepository(UploadedFile);

        const record = repo.create({
          user_id: req.currentUser.id,
          session_id: session_id || null,
          original_filename,
          stored_filename: null,
          file_path,
          mime_type: null,
          file_size: null,
          upload_type: 'IMAGE',
        });

        const saved = await repo.save(record);

        if (session_id) {
          try {
            const appDataSource2 = Container.get('appDataSource');
            const messageRepo = appDataSource2.getRepository(require('@/models/message').Message);
            await messageRepo.save({
              session_id: session_id,
              sender_type: 'USER',
              message_type: 'IMAGE',
              content: saved.file_path,
            });
          } catch (e) {
            const logger = Container.get('logger');
            logger.error('Failed to save image message: %o', e);
          }
        }

        return res.status(201).json(saved);
      } catch (e) {
        const logger = Container.get('logger');
        logger.error('Error saving image link: %o', e);
        return res.status(500).json({ detail: e.message || 'Error' });
      }
    },
  );

  // Upload an image file to Cloudinary and save metadata
  route.post(
    '/upload',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    upload.single('file'),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger = Container.get('logger');
      try {
        const file = req.file;
        const session_id = req.body.session_id;
        if (!file) return res.status(422).json({ message: 'file is required' });

        // Upload buffer to Cloudinary
        const streamUpload = (buffer: Buffer) =>
          new Promise<any>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({ folder: 'vital_uploads' }, (error, result) => {
              if (result) resolve(result);
              else reject(error);
            });
            streamifier.createReadStream(buffer).pipe(stream);
          });

        const result = await streamUpload(file.buffer);

        const appDataSource = Container.get('appDataSource');
        const repo = appDataSource.getRepository(UploadedFile);

        const record = repo.create({
          user_id: req.currentUser.id,
          session_id: session_id || null,
          original_filename: file.originalname,
          stored_filename: result.public_id,
          file_path: result.secure_url,
          mime_type: file.mimetype,
          file_size: file.size,
          upload_type: 'IMAGE',
        });

        const saved = await repo.save(record);

        // If attached to a session, also save a message record for image so chat messages API will return it
        if (session_id) {
          try {
            const appDataSource2 = Container.get('appDataSource');
            const messageRepo = appDataSource2.getRepository(require('@/models/message').Message);
            await messageRepo.save({
              session_id: session_id,
              sender_type: 'USER',
              message_type: 'IMAGE',
              content: saved.file_path,
            });
          } catch (e) {
            logger.error('Failed to save image message: %o', e);
          }
        }

        return res.status(201).json({ file: saved, cloudinary: result });
      } catch (e) {
        logger.error('Error uploading file to Cloudinary: %o', e);
        return res.status(500).json({ detail: e.message || 'Upload failed' });
      }
    },
  );
};
