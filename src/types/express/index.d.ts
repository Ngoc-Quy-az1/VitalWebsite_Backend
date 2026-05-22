import { User } from '@/models/user';

declare global {
  namespace Express {
    export interface Request {
      currentUser: Partial<User>;
      token: {
        _id: string;
        role: string;
        name: string;
        exp: number;
        iat?: number;
      };
    }
  }
}
