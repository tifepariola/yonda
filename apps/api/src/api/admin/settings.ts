import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getActiveGateway, setActiveGateway } from '../../services/payment';
import { requireAdmin } from './middleware';
import { asyncHandler } from '../../lib/asyncHandler';

export const settingsRouter = Router();
settingsRouter.use(requireAdmin);

// GET /api/admin/settings
settingsRouter.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const paymentGateway = await getActiveGateway();
  res.json({ paymentGateway });
}));

const updateSettingsSchema = z.object({
  paymentGateway: z.enum(['paystack', 'nomba']),
});

// PATCH /api/admin/settings
settingsRouter.patch('/', asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  await setActiveGateway(parsed.data.paymentGateway);
  res.json({ paymentGateway: parsed.data.paymentGateway });
}));
