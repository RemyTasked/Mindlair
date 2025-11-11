import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

// Augment Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
  };
}

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'secret'
    ) as { userId: string; email: string };

    req.userId = decoded.userId;
    req.user = { id: decoded.userId, email: decoded.email };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else {
      next(error);
    }
  }
};

// Optional authentication - doesn't throw error if no token
// Useful for routes that work differently for authenticated vs unauthenticated users
export const optionalAuthenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'secret'
      ) as { userId: string; email: string };

      req.userId = decoded.userId;
      req.user = { id: decoded.userId, email: decoded.email };
    }

    // Continue regardless of whether token was present or valid
    next();
  } catch (error) {
    // If token is invalid, just continue without setting userId
    // This allows the route to work for both authenticated and unauthenticated users
    next();
  }
};

