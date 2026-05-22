import { Container } from 'typedi';
import { EventSubscriber, On } from 'event-dispatch';
import events from './events';
import { IUser } from '@/interfaces/IUser';
import { Logger } from 'winston';
import { Repository } from 'typeorm';
import { User } from '@/models/user';

@EventSubscriber()
export default class UserSubscriber {
  /**
   * Update last login time when user signs in
   */
  @On(events.user.signIn)
  public async onUserSignIn({ id }: Partial<IUser>) {
    const logger: Logger = Container.get('logger');

    try {
      // keep silent in normal flow
    } catch (e) {
      logger.error(`🔥 Error on event ${events.user.signIn}: %o`, e);
      throw e;
    }
  }

  /**
   * Handle user sign up event
   */
  @On(events.user.signUp)
  public async onUserSignUp({ username, email, id }: Partial<User>) {
    const logger: Logger = Container.get('logger');

    try {
      /**
       * @TODO implement this
       * You can:
       * - Log user signup analytics
       * - Send welcome email via background job
       * - Initialize user profile/preferences
       * - Send to external tracking service
       */
      // keep silent in normal flow
    } catch (e) {
      logger.error(`🔥 Error on event ${events.user.signUp}: %o`, e);
      throw e;
    }
  }
}
