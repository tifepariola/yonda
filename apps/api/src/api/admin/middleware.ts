import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import getConfig from '../../config';

export interface AuthRequest extends Request {
  adminId: string;
  adminEmail: string;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const config = getConfig();
    const decoded = jwt.verify(token, config.JWT_SECRET) as { adminId: string; email: string };
    (req as AuthRequest).adminId = decoded.adminId;
    (req as AuthRequest).adminEmail = decoded.email;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
