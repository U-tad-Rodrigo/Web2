import type { HydratedDocument } from 'mongoose';
import type { IUser } from './index.js';

declare global {
  namespace Express {
    interface Request {
      user: HydratedDocument<IUser>;
    }
  }
}

export {};
