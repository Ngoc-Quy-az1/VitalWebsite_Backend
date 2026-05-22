import { Container } from 'typedi';
import MailerService from '@/services/mailer';
import { Logger } from 'winston';

/**
 * Email Sequence Job
 * This can be triggered manually or by scheduled jobs (using node-cron)
 * No longer uses Agenda - instead triggered by node-cron or manual API calls
 */
export default class EmailSequenceJob {
  public async handler(data: { email: string; name: string }): Promise<void> {
    try {
      const { email } = data;
      const mailerServiceInstance = Container.get(MailerService);
      await mailerServiceInstance.SendWelcomeEmail(email);
    } catch (e) {
      const logger: Logger = Container.get('logger');
      logger.error('🔥 Error with Email Sequence Job: %o', e);
      throw e;
    }
  }
}
