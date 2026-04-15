import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { setActiveRate, getActiveRate } from '../../services/fx';
import { requireAdmin, type AuthRequest } from './middleware';
import { asyncHandler } from '../../lib/asyncHandler';

export const ratesRouter = Router();
ratesRouter.use(requireAdmin);

// GET /api/admin/rates
ratesRouter.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const rates = await prisma.fxRate.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  res.json(rates);
}));

// GET /api/admin/rates/active
ratesRouter.get('/active', asyncHandler(async (_req: Request, res: Response) => {
  try {
    const rate = await getActiveRate();
    res.json(rate);
  } catch {
    res.status(404).json({ error: 'No active rate configured' });
  }
}));

// POST /api/admin/rates
const createRateSchema = z.object({
  baseRateCnyToNgn: z.number().positive(),
  marginPercent: z.number().min(0).max(0.5), // max 50% margin
});

ratesRouter.post('/', asyncHandler(async (req: Request, res: Response) => {
  const parsed = createRateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const rate = await setActiveRate({
    baseRateCnyToNgn: parsed.data.baseRateCnyToNgn,
    marginPercent: parsed.data.marginPercent,
    adminId: (req as AuthRequest).adminId,
  });

  res.status(201).json(rate);
}));
