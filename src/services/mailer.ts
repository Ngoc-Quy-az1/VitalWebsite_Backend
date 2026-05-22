import { Service, Inject } from 'typedi';
import { IUser } from '@/interfaces/IUser';
import nodemailer from 'nodemailer';
import config from '@/config';

@Service()
export default class MailerService {
  private transporter: nodemailer.Transporter;

  constructor(
    @Inject('logger') private logger,
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.emails.user,
        pass: config.emails.pass,
      },
    });
  }

  public async SendWelcomeEmail(email: string) {
    const mailOptions = {
      from: config.emails.from,
      to: email,
      subject: 'Welcome to VitalWebsite',
      text: 'Thank you for signing up! Welcome to our platform.'
    };
    try {
      await this.transporter.sendMail(mailOptions);
      return { delivered: 1, status: 'ok' };
    } catch(e) {
      this.logger.error('Failed to send welcome email', e);
      return  { delivered: 0, status: 'error' };
    }
  }

  public async SendOtpEmail(email: string, otp: string) {
    const mailOptions = {
      from: `"VitalWebsite Auth" <${config.emails.from}>`,
      to: email,
      subject: 'Your Verification Code',
      text: `Your verification code is: ${otp}. It will expire in 10 minutes.`,
    };
    try {
      await this.transporter.sendMail(mailOptions);
      // keep silent on successful email send
      return { delivered: 1, status: 'ok' };
    } catch(e) {
      this.logger.error('Failed to send email via Nodemailer. But OTP generated: ' + otp, e);
      return  { delivered: 0, status: 'error', otp }; // for local debugging
    }
  }

  public async StartEmailSequence(sequence: string, user: Partial<IUser>) {
    if (!user.email) {
      throw new Error('No email provided');
    }
    return { delivered: 1, status: 'ok' };
  }
}
