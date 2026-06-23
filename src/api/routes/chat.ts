import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import middlewares from '../middlewares';
import { celebrate, Joi } from 'celebrate';
import { Logger } from 'winston';
import { Repository } from 'typeorm';
import { ChatSession } from '@/models/chat-session';
import { Message } from '@/models/message';
import { clearConversationMemory } from '@/services/conversationMemory';

const route = Router();

export default (app: Router) => {
  app.use('/chat', route);

  route.post(
    '/sessions',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      body: Joi.object({
        title: Joi.string().optional().allow(''),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const chatSessionRepo = Container.get('chatSessionRepository') as Repository<ChatSession>;
        const userId = req.currentUser.id;
        const title = req.body.title || 'Cuộc trò chuyện mới';

        const session = await chatSessionRepo.save({
          user_id: userId,
          title: title,
        });

        return res.status(201).json(session);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.get(
    '/sessions',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const chatSessionRepo = Container.get('chatSessionRepository') as Repository<ChatSession>;
        const userId = req.currentUser.id;

        const sessions = await chatSessionRepo.find({
          where: { user_id: userId },
          order: { is_pinned: 'DESC', created_at: 'DESC' },
        });

        return res.status(200).json(sessions);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.get(
    '/sessions/:id/messages',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const chatSessionRepo = Container.get('chatSessionRepository') as Repository<ChatSession>;
        const messageRepo = Container.get('messageRepository') as Repository<Message>;
        const userId = req.currentUser.id;
        const sessionId = req.params.id;

        // Verify session belongs to user
        const session = await chatSessionRepo.findOne({
          where: { id: sessionId, user_id: userId },
        });

        if (!session) {
          return res.status(404).json({ message: 'Chat session not found' });
        }

        const messages = await messageRepo.find({
          where: { session_id: sessionId },
          order: { created_at: 'ASC' },
        });

        return res.status(200).json(messages);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.put(
    '/sessions/:id/pin',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      body: Joi.object({
        isPinned: Joi.boolean().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const chatSessionRepo = Container.get('chatSessionRepository') as Repository<ChatSession>;
        const userId = req.currentUser.id;
        const sessionId = req.params.id;
        const isPinned = req.body.isPinned;

        const session = await chatSessionRepo.findOne({
          where: { id: sessionId, user_id: userId },
        });

        if (!session) {
          return res.status(404).json({ message: 'Chat session not found' });
        }

        session.is_pinned = isPinned;
        await chatSessionRepo.save(session);

        return res.status(200).json(session);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.delete(
    '/sessions/:id',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const chatSessionRepo = Container.get('chatSessionRepository') as Repository<ChatSession>;
        const userId = req.currentUser.id;
        const sessionId = req.params.id;

        // Verify session belongs to user
        const session = await chatSessionRepo.findOne({
          where: { id: sessionId, user_id: userId },
        });

        if (!session) {
          return res.status(404).json({ message: 'Chat session not found' });
        }

        await chatSessionRepo.remove(session);
        clearConversationMemory(userId, sessionId);

        return res.status(200).json({ success: true, message: 'Chat session deleted successfully' });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
