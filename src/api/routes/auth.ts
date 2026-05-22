import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import AuthService from '@/services/auth';
import { IUserInputDTO } from '@/interfaces/IUser';
import middlewares from '../middlewares';
import { celebrate, Joi } from 'celebrate';
import { Logger } from 'winston';

const route = Router();

export default (app: Router) => {
  app.use('/auth', route);

  route.post(
    '/signup',
    celebrate({
      body: Joi.object({
        username: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        full_name: Joi.string().optional(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const authServiceInstance = Container.get(AuthService);
        const { user, token, refreshToken } = await authServiceInstance.SignUp(req.body as IUserInputDTO);
        return res.status(201).json({ user, token, refreshToken });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/signin',
    celebrate({
      body: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const { email, password } = req.body;
        const authServiceInstance = Container.get(AuthService);
        const { user, token, refreshToken } = await authServiceInstance.SignIn(email, password);
        return res.status(200).json({ user, token, refreshToken });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/google',
    celebrate({
      body: Joi.object({
        token: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const { token } = req.body;
        const authServiceInstance = Container.get(AuthService);
        const { user, token: jwtToken, refreshToken } = await authServiceInstance.GoogleSignIn(token);
        return res.status(200).json({ user, token: jwtToken, refreshToken });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/verify-otp',
    celebrate({
      body: Joi.object({
        email: Joi.string().email().required(),
        otp: Joi.string().length(6).required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const { email, otp } = req.body;
        const authServiceInstance = Container.get(AuthService);
        const result = await authServiceInstance.VerifyOTP(email, otp);
        return res.status(200).json(result);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/refresh',
    celebrate({
      body: Joi.object({
        refreshToken: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const { refreshToken: oldToken } = req.body;
        const authServiceInstance = Container.get(AuthService);
        const { token, refreshToken } = await authServiceInstance.Refresh(oldToken);
        return res.status(200).json({ token, refreshToken });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        const message = e instanceof Error ? e.message : 'Unauthorized';
        return res.status(401).json({ message });
      }
    },
  );

  route.post('/logout', middlewares.isAuth, middlewares.attachCurrentUser, async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    try {
      const refreshTokenRepository = Container.get('refreshTokenRepository') as any;
      if (req.currentUser && req.currentUser.id) {
        await refreshTokenRepository.delete({ user_id: req.currentUser.id });
      }
      return res.status(200).json({ message: 'Logged out successfully' });
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });
};
