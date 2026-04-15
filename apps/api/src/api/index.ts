import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma';
import { whatsappWebhookRouter } from './webhooks/whatsapp';
import { paystackWebhookRouter } from './webhooks/paystack';
import { authRouter } from './admin/auth';
import { ordersRouter } from './admin/orders';
import { usersRouter } from './admin/users';
import { ratesRouter } from './admin/rates';

export const apiRouter = Router();

// Webhooks (public)
apiRouter.use('/webhooks/whatsapp', whatsappWebhookRouter);
apiRouter.use('/webhooks/paystack', paystackWebhookRouter);

// Admin API
apiRouter.use('/admin/auth', authRouter);
apiRouter.use('/admin/orders', ordersRouter);
apiRouter.use('/admin/users', usersRouter);
apiRouter.use('/admin/kyc', usersRouter); // re-use users router — KYC routes are prefixed /kyc/
apiRouter.use('/admin/rates', ratesRouter);

// TEMPORARY — remove after seeding
apiRouter.get('/seed', async (_req, res) => {
  const hash = await bcrypt.hash('changeme123', 12);
  await prisma.adminUser.upsert({
    where: { email: 'admin@yonda.ng' },
    create: { email: 'admin@yonda.ng', passwordHash: hash, name: 'Admin' },
    update: {},
  });
  await prisma.fxRate.upsert({
    where: { id: 'seed' },
    create: { id: 'seed', baseRateCnyToNgn: 220, marginPercent: 0.05, effectiveRateCnyToNgn: 231, isActive: true },
    update: {},
  });
  res.json({ ok: true });
});
