import cron from 'node-cron';
import { Container } from 'typedi';
import { Logger } from 'winston';
import MailerService from '@/services/mailer';

export default async () => {
  /**
   * Email sequence job - runs daily at 8 AM
   * You can modify the cron expression as needed
   * Format: minute, hour, day of month, month, day of week
   */
  cron.schedule('0 8 * * *', async () => {
    try {
      // Add your scheduled email logic here if needed
    } catch (error) {
      const logger: Logger = Container.get('logger');
      logger.error('🔥 Error running email job: %o', error);
    }
  });
};
