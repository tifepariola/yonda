import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma';
import getConfig from '../../config';
import logger from '../../lib/logger';
import { requireAdmin, type AuthRequest } from './middleware';

export const authRouter = Router();

authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !admin.isActive) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

  const config = getConfig();
  const token = jwt.sign({ adminId: admin.id, email: admin.email }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as unknown as number,
  });

  logger.info({ adminId: admin.id }, 'Admin logged in');

  res.json({
    token,
    admin: { id: admin.id, email: admin.email, name: admin.name },
  });
});

authRouter.get('/me', requireAdmin, (req: Request, res: Response) => {
  const auth = req as AuthRequest;
  res.json({ adminId: auth.adminId, email: auth.adminEmail });
});
