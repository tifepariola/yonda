import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { decrypt } from '../../lib/crypto';
import { requireAdmin, type AuthRequest } from './middleware';
import { notifyKycApproved, notifyKycRejected } from '../../services/notification';
import logger from '../../lib/logger';
import { asyncHandler } from '../../lib/asyncHandler';

export const usersRouter = Router();
usersRouter.use(requireAdmin);

// GET /api/admin/users
usersRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { kycStatus, phone, page = '1', limit = '20' } = req.query as Record<string, string>;

  const where: Prisma.UserWhereInput = {};
  if (kycStatus) where.kycStatus = kycStatus as Prisma.EnumKycStatusFilter;
  if (phone) where.whatsappPhone = { contains: phone };

  const pageNum = Math.max(1, parseInt(page));
  const take = Math.min(100, parseInt(limit));
  const skip = (pageNum - 1) * take;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        whatsappPhone: true,
        name: true,
        kycStatus: true,
        isBlocked: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ users, total, page: pageNum, pages: Math.ceil(total / take) });
}));

// GET /api/admin/users/:id
usersRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { orders: { orderBy: { createdAt: 'desc' }, take: 10 } },
  });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  // Mask BVN for listing — only show last 4 digits
  const maskedBvn = user.bvn ? `*******${decrypt(user.bvn).slice(-4)}` : null;

  res.json({ ...user, bvn: maskedBvn });
}));

// GET /api/admin/users/:id/bvn — decrypted BVN for KYC review
usersRouter.get('/:id/bvn', asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  if (!user.bvn) { res.status(404).json({ error: 'No BVN on file' }); return; }

  const bvn = decrypt(user.bvn);
  logger.info(
    { adminId: (req as AuthRequest).adminId, userId: user.id },
    'Admin viewed BVN',
  );
  res.json({ bvn });
}));

// PATCH /api/admin/users/:id/block
usersRouter.patch('/:id/block', asyncHandler(async (req: Request, res: Response) => {
  const { blocked } = req.body as { blocked?: boolean };
  if (typeof blocked !== 'boolean') { res.status(400).json({ error: 'blocked (boolean) required' }); return; }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isBlocked: blocked },
  });
  res.json({ id: updated.id, isBlocked: updated.isBlocked });
}));

// ─── KYC Routes ──────────────────────────────────────────────────────────────

// GET /api/admin/kyc/queue (also accessible via /api/admin/users/kyc/queue)
usersRouter.get('/kyc/queue', asyncHandler(async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    where: { kycStatus: 'SUBMITTED' },
    orderBy: { createdAt: 'asc' },
  });
  res.json(users);
}));

// PATCH /api/admin/kyc/:userId/approve
usersRouter.patch('/kyc/:userId/approve', asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const updated = await prisma.user.update({
    where: { id: req.params.userId },
    data: {
      kycStatus: 'VERIFIED',
      kycReviewedAt: new Date(),
      kycReviewedBy: (req as AuthRequest).adminId,
      kycRejectionReason: null,
    },
  });

  notifyKycApproved(updated).catch((err) =>
    logger.warn({ err, userId: updated.id }, 'Failed to send KYC approval notification'),
  );

  res.json({ id: updated.id, kycStatus: updated.kycStatus });
}));

// PATCH /api/admin/kyc/:userId/reject
usersRouter.patch('/kyc/:userId/reject', asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body as { reason?: string };
  if (!reason) { res.status(400).json({ error: 'reason required' }); return; }

  const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const updated = await prisma.user.update({
    where: { id: req.params.userId },
    data: {
      kycStatus: 'REJECTED',
      kycReviewedAt: new Date(),
      kycReviewedBy: (req as AuthRequest).adminId,
      kycRejectionReason: reason,
    },
  });

  notifyKycRejected(updated, reason).catch((err) =>
    logger.warn({ err, userId: updated.id }, 'Failed to send KYC rejection notification'),
  );

  res.json({ id: updated.id, kycStatus: updated.kycStatus });
}));
