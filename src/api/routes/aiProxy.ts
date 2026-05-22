import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import middlewares from '../middlewares';
import config from '@/config';
import axios from 'axios';
import multer from 'multer';
import FormData from 'form-data';
import { Repository } from 'typeorm';
import { ChatSession } from '@/models/chat-session';
import { Message } from '@/models/message';
import { Logger } from 'winston';

const route = Router();
const upload = multer({ storage: multer.memoryStorage() });

export default (app: Router) => {
  app.use('/ai', route);

  // Helper to update chat session title based on first query
  const updateSessionTitleIfNeeded = async (
    chatSessionRepo: Repository<ChatSession>,
    sessionId: string,
    query: string,
    logger: Logger,
  ) => {
    try {
      const session = await chatSessionRepo.findOne({ where: { id: sessionId } });
      if (session && (session.title === 'Cuộc trò chuyện mới' || !session.title)) {
        session.title = query;
        await chatSessionRepo.save(session);
        // keep silent in normal flow
      }
    } catch (err) {
      logger.error(`Failed to update session title: ${err}`);
    }
  };

  // Endpoint /1 -> Proxy to chatbot /chat/answer (Sync QA)
  route.post(
    '/1',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const {
          query,
          top_k,
          disease_name,
          section_type,
          source_type,
          biomarker,
          include_debug,
          session_id: sessionId,
        } = req.body;

        if (!query) {
          return res.status(422).json({ message: 'query is required' });
        }

        // Forward to python chatbot_api
        const response = await axios.post(`${config.vitalAI.chatbotApiUrl}/chat/answer`, {
          query,
          top_k,
          disease_name,
          section_type,
          source_type,
          biomarker,
          include_debug,
        });

        // Save history in background if sessionId is provided
        if (sessionId) {
          const messageRepo = Container.get('messageRepository') as Repository<Message>;
          const chatSessionRepo = Container.get('chatSessionRepository') as Repository<ChatSession>;

          const answerText = response.data.answer || '';

          // Save user prompt
          await messageRepo.save({
            session_id: sessionId,
            sender_type: 'USER',
            message_type: 'TEXT',
            content: query,
          });

          // Save bot answer
          await messageRepo.save({
            session_id: sessionId,
            sender_type: 'BOT',
            message_type: 'TEXT',
            content: answerText,
          });

          await updateSessionTitleIfNeeded(chatSessionRepo, sessionId, query, logger);
        }

        return res.status(200).json(response.data);
      } catch (e) {
        logger.error('🔥 error in AI Proxy /1: %o', e.message || e);
        const status = e.response?.status || 500;
        const detail = e.response?.data?.detail || e.message || 'Error occurred';
        return res.status(status).json({ detail });
      }
    },
  );

  // Endpoint /2 -> Proxy to chatbot /chat/stream (SSE Stream QA)
  route.post(
    '/2',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const {
          query,
          top_k,
          disease_name,
          section_type,
          source_type,
          biomarker,
          include_debug,
          session_id: sessionId,
        } = req.body;

        if (!query) {
          return res.status(422).json({ message: 'query is required' });
        }

        // Setup headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        // Request streaming from FastAPI
        const response = await axios({
          method: 'post',
          url: `${config.vitalAI.chatbotApiUrl}/chat/stream`,
          data: {
            query,
            top_k,
            disease_name,
            section_type,
            source_type,
            biomarker,
            include_debug,
          },
          responseType: 'stream',
        });

        let accumulatedAnswer = '';

        // Pipe stream data in real-time
        response.data.on('data', (chunk: Buffer) => {
          res.write(chunk);

          // Parse token content for history saving
          const chunkStr = chunk.toString();
          const lines = chunkStr.split('\n');
          for (const line of lines) {
            if (line.startsWith('data:')) {
              try {
                const jsonStr = line.slice(5).trim();
                const payload = JSON.parse(jsonStr);
                if (payload.token) {
                  accumulatedAnswer += payload.token;
                } else if (payload.answer) {
                  accumulatedAnswer = payload.answer;
                }
              } catch (e) {
                // Ignore partial chunk JSON parsing errors
              }
            }
          }
        });

        response.data.on('end', async () => {
          res.end();

          // Save chat history once stream completes successfully
          if (sessionId) {
            try {
              const messageRepo = Container.get('messageRepository') as Repository<Message>;
              const chatSessionRepo = Container.get('chatSessionRepository') as Repository<ChatSession>;

              // Save user query
              await messageRepo.save({
                session_id: sessionId,
                sender_type: 'USER',
                message_type: 'TEXT',
                content: query,
              });

              // Save bot answer
              await messageRepo.save({
                session_id: sessionId,
                sender_type: 'BOT',
                message_type: 'TEXT',
                content: accumulatedAnswer || 'Mình chưa tạo được câu trả lời từ hệ thống.',
              });

              await updateSessionTitleIfNeeded(chatSessionRepo, sessionId, query, logger);
            } catch (historyErr) {
              logger.error('Failed to save streamed history: %o', historyErr);
            }
          }
        });

        response.data.on('error', (err: Error) => {
          logger.error('Stream response error: %o', err);
          res.write(`event: error\ndata: ${JSON.stringify({ detail: err.message })}\n\n`);
          res.end();
        });
      } catch (e) {
        logger.error('🔥 error in AI Proxy /2: %o', e.message || e);
        const status = e.response?.status || 500;
        const detail = e.response?.data?.detail || e.message || 'Error occurred';
        res.status(status).json({ detail });
      }
    },
  );

  // Endpoint /3 -> Proxy to chatbot /voice/tts/prepare
  route.post(
    '/3',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const { text } = req.body;

        const response = await axios.post(`${config.vitalAI.chatbotApiUrl}/voice/tts/prepare`, {
          text,
        });

        return res.status(200).json(response.data);
      } catch (e) {
        logger.error('🔥 error in AI Proxy /3: %o', e.message || e);
        const status = e.response?.status || 500;
        const detail = e.response?.data?.detail || e.message || 'Error occurred';
        return res.status(status).json({ detail });
      }
    },
  );

  // Endpoint /6 -> Proxy to chatbot /voice/stt (accepts base64 WAV)
  route.post(
    '/6',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const { audio_base64, language } = req.body;
        if (!audio_base64) {
          return res.status(422).json({ message: 'audio_base64 is required' });
        }

        const response = await axios.post(`${config.vitalAI.chatbotApiUrl}/voice/stt`, {
          audio_base64,
          language: language || 'vi',
        }, { timeout: 120000 });
        return res.status(200).json(response.data);
      } catch (e) {
        // If upstream returned a response, log its body for debugging
        if (e.response) {
          logger.error('🔥 error in AI Proxy /6 upstream status=%d body=%o', e.response.status, e.response.data);
          const status = e.response.status || 502;
          const detail = e.response.data?.detail || e.response.data || e.message || 'Upstream error';
          return res.status(status).json({ detail, upstream: e.response.data });
        }

        logger.error('🔥 error in AI Proxy /6: %o', e.message || e);
        const status = e.status || 500;
        const detail = e.message || 'Error occurred';
        return res.status(status).json({ detail });
      }
    },
  );

  // Endpoint /4 -> Proxy multipart /health-report/analyze-image (Medical Tools)
  route.post(
    '/4',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    upload.single('file'),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const file = req.file;
        if (!file) {
          return res.status(400).json({ message: 'file is required' });
        }

        const formData = new FormData();
        formData.append('file', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
        if (req.body.language) formData.append('language', req.body.language);
        if (req.body.patient_id) formData.append('patient_id', req.body.patient_id);

        const response = await axios.post(
          `${config.vitalAI.medicalToolsApiUrl}/health-report/analyze-image`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
            },
          },
        );

        return res.status(200).json(response.data);
      } catch (e) {
        logger.error('🔥 error in AI Proxy /4: %o', e.message || e);
        const status = e.response?.status || 500;
        const detail = e.response?.data?.detail || e.message || 'Error occurred';
        return res.status(status).json({ detail });
      }
    },
  );

  // Endpoint /5 -> Proxy multipart /health-report/analyze-and-answer (One-shot QA OCR)
  route.post(
    '/5',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    upload.single('file'),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const file = req.file;
        if (!file) {
          return res.status(400).json({ message: 'file is required' });
        }

        const question = req.body.question || 'Phân tích ảnh đã tải lên';
        const sessionId = req.body.session_id;

        const formData = new FormData();
        formData.append('file', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });
        formData.append('question', question);
        if (req.body.language) formData.append('language', req.body.language);
        if (req.body.patient_id) formData.append('patient_id', req.body.patient_id);
        if (req.body.top_k) formData.append('top_k', req.body.top_k);

        const response = await axios.post(
          `${config.vitalAI.chatbotApiUrl}/health-report/analyze-and-answer`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
            },
            timeout: 300000, // 5 minutes timeout as OCR can be slow
          },
        );

        // Save history in background if sessionId is provided
        if (sessionId) {
          const messageRepo = Container.get('messageRepository') as Repository<Message>;
          const chatSessionRepo = Container.get('chatSessionRepository') as Repository<ChatSession>;

          const answerText = response.data.answer || '';

          // Save user query
          await messageRepo.save({
            session_id: sessionId,
            sender_type: 'USER',
            message_type: 'TEXT',
            content: `${question} (Ảnh đính kèm: ${file.originalname})`,
          });

          // Save bot answer
          await messageRepo.save({
            session_id: sessionId,
            sender_type: 'BOT',
            message_type: 'TEXT',
            content: answerText,
          });

          await updateSessionTitleIfNeeded(chatSessionRepo, sessionId, question, logger);
        }

        return res.status(200).json(response.data);
      } catch (e) {
        logger.error('🔥 error in AI Proxy /5: %o', e.message || e);
        const status = e.response?.status || 500;
        const detail = e.response?.data?.detail || e.message || 'Error occurred';
        return res.status(status).json({ detail });
      }
    },
  );
};
