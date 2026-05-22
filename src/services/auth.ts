import { Service, Inject } from 'typedi';
import jwt from 'jsonwebtoken';
import MailerService from './mailer';
import config from '@/config';
import argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { IUser, IUserInputDTO } from '@/interfaces/IUser';
import { EventDispatcher, EventDispatcherInterface } from '@/decorators/eventDispatcher';
import events from '@/subscribers/events';
import { Repository } from 'typeorm';
import { User } from '@/models/user';
import { RefreshToken } from '@/models/refresh-token';
import { OAuth2Client } from 'google-auth-library';

@Service()
export default class AuthService {
  constructor(
    @Inject('userRepository') private userRepository: Repository<User>,
    @Inject('refreshTokenRepository') private refreshTokenRepository: Repository<RefreshToken>,
    private mailer: MailerService,
    @Inject('logger') private logger,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {
  }

  public async SignUp(userInputDTO: IUserInputDTO): Promise<{ user: Partial<User>; token: string; refreshToken: string }> {
    try {
      this.logger.silly('Hashing password');
      const hashedPassword = await argon2.hash(userInputDTO.password);
      this.logger.silly('Creating user db record');
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date();
      otpExpires.setMinutes(otpExpires.getMinutes() + 10);

      const userRecord = await this.userRepository.save({
        username: userInputDTO.username,
        email: userInputDTO.email,
        password_hash: hashedPassword,
        full_name: userInputDTO.full_name,
        otp_code: otpCode,
        otp_expires_at: otpExpires,
        is_verified: false,
      });

      if (!userRecord) {
        throw new Error('User cannot be created');
      }
      this.logger.silly('Generating JWT');
      const token = this.generateToken(userRecord);
      const refreshToken = await this.generateRefreshToken(userRecord);

      this.logger.silly('Sending OTP email');
      await this.mailer.SendOtpEmail(userRecord.email, otpCode);

      this.eventDispatcher.dispatch(events.user.signUp, { user: userRecord });

      const user = { ...userRecord };
      delete (user as any).password_hash;
      return { user, token, refreshToken };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async SignIn(email: string, password: string): Promise<{ user: Partial<User>; token: string; refreshToken: string }> {
    const userRecord = await this.userRepository.findOne({ where: { email } });
    if (!userRecord) {
      throw new Error('User not registered');
    }
    if (!userRecord.password_hash) {
      throw new Error('This account was registered using Google. Please log in using Google Sign-In.');
    }
    /**
     * We use verify from argon2 to prevent 'timing based' attacks
     */
    this.logger.silly('Checking password');
    const validPassword = await argon2.verify(userRecord.password_hash, password);
    if (validPassword) {
      this.logger.silly('Password is valid!');
      this.logger.silly('Generating JWT');
      const token = this.generateToken(userRecord);
      const refreshToken = await this.generateRefreshToken(userRecord);

      // Dispatch signIn event
      this.eventDispatcher.dispatch(events.user.signIn, { id: userRecord.id });

      const user = { ...userRecord };
      delete (user as any).password_hash;
      return { user, token, refreshToken };
    } else {
      throw new Error('Invalid Password');
    }
  }

  public async GoogleSignIn(idToken: string): Promise<{ user: Partial<User>; token: string; refreshToken: string }> {
    try {
      if (!config.googleClientId) {
        throw new Error('Google Client ID is not configured');
      }

      this.logger.silly('Verifying Google ID Token');
      const googleClient = new OAuth2Client();
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: config.googleClientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Google token payload is empty');
      }

      const { email, name, sub: googleId } = payload;
      if (!email) {
        throw new Error('Google token payload is missing email');
      }

      this.logger.silly(`Google token verified successfully for: ${email}`);

      // 1. Find user by google_id or by email
      let userRecord = await this.userRepository.findOne({
        where: [
          { google_id: googleId },
          { email: email }
        ]
      });

      if (userRecord) {
        // User exists. Update google_id if it's not set yet
        if (!userRecord.google_id) {
          this.logger.silly(`Linking Google login to existing email: ${email}`);
          userRecord.google_id = googleId;
          // Also set is_verified to true since Google emails are verified
          userRecord.is_verified = true;
          await this.userRepository.save(userRecord);
        }
      } else {
        // 2. User doesn't exist, create a new one
        this.logger.silly(`Creating new user for Google login: ${email}`);
        
        // Generate a clean, unique username from email
        let baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
        let username = baseUsername;
        let isUsernameUnique = false;
        let counter = 1;
        
        while (!isUsernameUnique) {
          const existing = await this.userRepository.findOne({ where: { username } });
          if (!existing) {
            isUsernameUnique = true;
          } else {
            username = `${baseUsername}${counter}`;
            counter++;
          }
        }

        userRecord = await this.userRepository.save({
          username,
          email,
          google_id: googleId,
          full_name: name || baseUsername,
          password_hash: null,
          is_verified: true, // Google has already verified their email
        });
      }

      if (!userRecord.is_active) {
        throw new Error('User account is inactive');
      }

      this.logger.silly('Generating JWT for Google user');
      const token = this.generateToken(userRecord);
      const refreshToken = await this.generateRefreshToken(userRecord);

      // Dispatch signIn event
      this.eventDispatcher.dispatch(events.user.signIn, { id: userRecord.id });

      const user = { ...userRecord };
      delete (user as any).password_hash;
      return { user, token, refreshToken };
    } catch (e) {
      this.logger.error('Error during Google Sign-In: %o', e);
      throw e;
    }
  }

  public async VerifyOTP(email: string, otp: string): Promise<{ success: boolean; message: string }> {
    const userRecord = await this.userRepository.findOne({ where: { email } });
    if (!userRecord) {
      throw new Error('User not registered');
    }
    if (userRecord.is_verified) {
      throw new Error('User is already verified');
    }
    if (userRecord.otp_code !== otp) {
      throw new Error('Invalid OTP');
    }
    if (userRecord.otp_expires_at && userRecord.otp_expires_at < new Date()) {
      throw new Error('OTP expired');
    }

    userRecord.is_verified = true;
    userRecord.otp_code = null;
    userRecord.otp_expires_at = null;
    await this.userRepository.save(userRecord);

    return { success: true, message: 'Account verified successfully' };
  }

  public async Refresh(oldRefreshToken: string): Promise<{ token: string; refreshToken: string }> {
    this.logger.silly(`Refreshing token using refresh token: ${oldRefreshToken}`);
    const refreshTokenRecord = await this.refreshTokenRepository.findOne({
      where: { token: oldRefreshToken },
      relations: ['user'],
    });

    if (!refreshTokenRecord) {
      throw new Error('Invalid refresh token');
    }

    if (refreshTokenRecord.expires_at < new Date()) {
      await this.refreshTokenRepository.remove(refreshTokenRecord);
      throw new Error('Refresh token has expired');
    }

    const user = refreshTokenRecord.user;
    if (!user || !user.is_active) {
      throw new Error('User is inactive or not found');
    }

    // Token rotation: delete old and generate new ones
    await this.refreshTokenRepository.remove(refreshTokenRecord);

    const token = this.generateToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    return { token, refreshToken };
  }

  private generateToken(user: User) {
    this.logger.silly(`Sign JWT for userId: ${user.id}`);
    return jwt.sign(
      {
        _id: user.id,
        role: user.role,
        username: user.username,
      },
      config.jwtSecret,
      {
        expiresIn: '15m',
        algorithm: config.jwtAlgorithm as any || 'HS256',
      }
    );
  }

  private async generateRefreshToken(user: User): Promise<string> {
    const token = randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

    await this.refreshTokenRepository.save({
      user_id: user.id,
      token,
      expires_at: expiresAt,
    });

    return token;
  }
}

