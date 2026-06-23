import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import middlewares from '../middlewares';
import { Repository } from 'typeorm';
import { User } from '@/models/user';
import { ChatSession } from '@/models/chat-session';
import { Message } from '@/models/message';
import { Logger } from 'winston';

const route = Router();

// Middleware to check if current user is admin
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.currentUser && req.currentUser.role === 'ADMIN') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Admin role required' });
};

export default (app: Router) => {
  app.use('/admin', middlewares.isAuth, middlewares.attachCurrentUser, isAdmin, route);

  // GET stats (fully dynamic)
  route.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    try {
      const userRepo = Container.get('userRepository') as Repository<User>;
      const sessionRepo = Container.get('chatSessionRepository') as Repository<ChatSession>;
      const messageRepo = Container.get('messageRepository') as Repository<Message>;

      const totalUsers = await userRepo.count();
      const totalSessions = await sessionRepo.count();
      const totalMessages = await messageRepo.count();

      // 1. Calculate daily message count for the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      // reset time to midnight to capture full days
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const dailyMessages = await messageRepo.createQueryBuilder('m')
        .select("TO_CHAR(m.created_at, 'YYYY-MM-DD')", 'date')
        .addSelect('COUNT(m.id)', 'count')
        .where('m.created_at >= :sevenDaysAgo', { sevenDaysAgo })
        .groupBy("TO_CHAR(m.created_at, 'YYYY-MM-DD')")
        .orderBy('date', 'ASC')
        .getRawMany();

      const statsMap = new Map(dailyMessages.map(item => [item.date, parseInt(item.count, 10)]));
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const label = `${d.getDate()}/${d.getMonth() + 1}`;
        chartData.push({
          date: dateStr,
          label,
          count: statsMap.get(dateStr) || 0
        });
      }

      // 2. User Roles Distribution
      const rolesData = await userRepo.createQueryBuilder('u')
        .select('u.role', 'role')
        .addSelect('COUNT(u.id)', 'count')
        .groupBy('u.role')
        .getRawMany();

      // 3. Topic keyword matching counts
      const creatinineCount = await messageRepo.createQueryBuilder('m')
        .where("LOWER(m.content) LIKE '%creatinine%' OR LOWER(m.content) LIKE '%egfr%' OR LOWER(m.content) LIKE '%xét nghiệm%'")
        .getCount();
      const nutritionCount = await messageRepo.createQueryBuilder('m')
        .where("LOWER(m.content) LIKE '%ăn%' OR LOWER(m.content) LIKE '%uống%' OR LOWER(m.content) LIKE '%dinh dưỡng%'")
        .getCount();
      const symptomCount = await messageRepo.createQueryBuilder('m')
        .where("LOWER(m.content) LIKE '%triệu chứng%' OR LOWER(m.content) LIKE '%biểu hiện%' OR LOWER(m.content) LIKE '%đau%'")
        .getCount();

      const totalKeywords = (creatinineCount + nutritionCount + symptomCount) || 1;
      const popularTopics = [
        { name: 'Creatinine & eGFR', percentage: Math.round((creatinineCount / totalKeywords) * 100) || 0, icon: '🧪' },
        { name: 'Dinh dưỡng thận', percentage: Math.round((nutritionCount / totalKeywords) * 100) || 0, icon: '🥗' },
        { name: 'Triệu chứng', percentage: Math.round((symptomCount / totalKeywords) * 100) || 0, icon: '⚠️' }
      ].sort((a, b) => b.percentage - a.percentage);

      return res.status(200).json({
        totalUsers,
        totalSessions,
        totalMessages,
        chartData,
        rolesData: rolesData.map(r => ({ role: r.role, count: parseInt(r.count, 10) })),
        popularTopics,
      });
    } catch (e) {
      logger.error('🔥 Error fetching admin stats: %o', e);
      return next(e);
    }
  });

  // GET users list with session & message counts
  route.get('/users', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    try {
      const userRepo = Container.get('userRepository') as Repository<User>;

      // Get basic user records
      const users = await userRepo.find({
        select: ['id', 'username', 'email', 'full_name', 'role', 'is_active', 'created_at'],
        order: { created_at: 'DESC' },
      });

      // Get stats counts per user
      const rawStats = await userRepo.createQueryBuilder('u')
        .leftJoin('u.chatSessions', 'cs')
        .leftJoin('cs.messages', 'm')
        .select('u.id', 'userId')
        .addSelect('COUNT(DISTINCT cs.id)', 'sessionCount')
        .addSelect('COUNT(m.id)', 'messageCount')
        .groupBy('u.id')
        .getRawMany();

      const statsMap = new Map(rawStats.map(s => [s.userId, s]));

      const userList = users.map(user => {
        const uStats = statsMap.get(user.id);
        return {
          ...user,
          sessionCount: uStats ? parseInt(uStats.sessionCount, 10) : 0,
          messageCount: uStats ? parseInt(uStats.messageCount, 10) : 0,
        };
      });

      return res.status(200).json(userList);
    } catch (e) {
      logger.error('🔥 Error fetching admin users list: %o', e);
      return next(e);
    }
  });

  // GET all sessions in the system (with user details & message counts)
  route.get('/sessions', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    try {
      const sessionRepo = Container.get('chatSessionRepository') as Repository<ChatSession>;

      const sessions = await sessionRepo.find({
        relations: ['user'],
        order: { created_at: 'DESC' },
      });

      const rawMsgCounts = await sessionRepo.createQueryBuilder('cs')
        .leftJoin('cs.messages', 'm')
        .select('cs.id', 'sessionId')
        .addSelect('COUNT(m.id)', 'messageCount')
        .groupBy('cs.id')
        .getRawMany();

      const countsMap = new Map(rawMsgCounts.map(c => [c.sessionId, parseInt(c.messageCount, 10)]));

      const sessionsWithStats = sessions.map(session => ({
        id: session.id,
        title: session.title,
        is_pinned: session.is_pinned,
        created_at: session.created_at,
        updated_at: session.updated_at,
        user: {
          id: session.user?.id,
          username: session.user?.username,
          email: session.user?.email,
          full_name: session.user?.full_name,
        },
        messageCount: countsMap.get(session.id) || 0,
      }));

      return res.status(200).json(sessionsWithStats);
    } catch (e) {
      logger.error('🔥 Error fetching admin all sessions: %o', e);
      return next(e);
    }
  });

  // GET all sessions of a user
  route.get('/users/:userId/sessions', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    try {
      const sessionRepo = Container.get('chatSessionRepository') as Repository<ChatSession>;
      const userId = req.params.userId;

      const sessions = await sessionRepo.find({
        where: { user_id: userId },
        order: { created_at: 'DESC' },
      });

      return res.status(200).json(sessions);
    } catch (e) {
      logger.error('🔥 Error fetching admin user sessions: %o', e);
      return next(e);
    }
  });

  // GET messages within a session
  route.get('/sessions/:sessionId/messages', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    try {
      const messageRepo = Container.get('messageRepository') as Repository<Message>;
      const sessionId = req.params.sessionId;

      const messages = await messageRepo.find({
        where: { session_id: sessionId },
        order: { created_at: 'ASC' },
      });

      return res.status(200).json(messages);
    } catch (e) {
      logger.error('🔥 Error fetching admin session messages: %o', e);
      return next(e);
    }
  });
};
