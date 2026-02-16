import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.username !== 'micah') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
