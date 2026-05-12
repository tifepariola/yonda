import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getActiveGateway, setActiveGateway } from '../../services/payment';
import { createNombaCheckout } from '../../services/nomba';
import { requireAdmin } from './middleware';
import { asyncHandler } from '../../lib/asyncHandler';
import getConfig from '../../config';

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

// GET /api/admin/settings/test-nomba
settingsRouter.get('/test-nomba', asyncHandler(async (_req: Request, res: Response) => {
  const config = getConfig();
  if (!config.NOMBA_CLIENT_ID || !config.NOMBA_CLIENT_SECRET || !config.NOMBA_ACCOUNT_ID) {
    res.status(400).json({ ok: false, error: 'Nomba credentials not set (NOMBA_CLIENT_ID, NOMBA_CLIENT_SECRET, NOMBA_ACCOUNT_ID)' });
    return;
  }

  try {
    const result = await createNombaCheckout({
      orderId: 'test',
      userId: 'test',
      ngnAmount: 100,
      orderReference: `test-${Date.now()}`,
      phone: '+2340000000000',
    });
    res.json({ ok: true, checkoutLink: result.checkoutLink, orderReference: result.orderReference });
  } catch (err) {
    res.status(502).json({ ok: false, error: (err as Error).message });
  }
}));

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
