import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: number; email: string };
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, error: 'Token expired' });
    } else {
      res.status(401).json({ success: false, error: 'Invalid token' });
    }
  }
}

export function generateAccessToken(userId: number, email: string): string {
  return jwt.sign({ userId, email }, config.jwtSecret, { expiresIn: config.accessTokenExpiry as any });
}

export function generateRefreshToken(userId: number, email: string): string {
  return jwt.sign({ userId, email }, config.jwtRefreshSecret, { expiresIn: config.refreshTokenExpiry as any });
}

export function verifyRefreshToken(token: string): { userId: number; email: string } | null {
  try {
    return jwt.verify(token, config.jwtRefreshSecret) as { userId: number; email: string };
  } catch {
    return null;
  }
}
