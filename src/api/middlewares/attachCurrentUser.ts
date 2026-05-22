import { Container } from 'typedi';
import { Repository } from 'typeorm';
import { User } from '@/models/user';
import { Logger } from 'winston';

/**
 * Attach user to req.currentUser
 * @param {*} req Express req Object
 * @param {*} res  Express res Object
 * @param {*} next  Express next Function
 */
const attachCurrentUser = async (req, res, next) => {
  const logger: Logger = Container.get('logger');
  try {
    const userRepository = Container.get('userRepository') as Repository<User>;
    const userRecord = await userRepository.findOne({ where: { id: req.token._id } });
    if (!userRecord) {
      return res.sendStatus(401);
    }
    const currentUser = { ...userRecord };
    delete currentUser.password_hash;
    req.currentUser = currentUser;
    return next();
  } catch (e) {
    logger.error('🔥 Error attaching user to req: %o', e);
    return next(e);
  }
};

export default attachCurrentUser;
