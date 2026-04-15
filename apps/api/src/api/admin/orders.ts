import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { requireAdmin } from './middleware';

export const ordersRouter = Router();
ordersRouter.use(requireAdmin);

// GET /api/admin/orders
ordersRouter.get('/', async (req: Request, res: Response) => {
  const { status, phone, page = '1', limit = '20' } = req.query as Record<string, string>;

  const where: Prisma.OrderWhereInput = {};
  if (status) where.status = status as Prisma.EnumOrderStatusFilter;
  if (phone) {
    where.user = { whatsappPhone: { contains: phone } };
  }

  const pageNum = Math.max(1, parseInt(page));
  const take = Math.min(100, parseInt(limit));
  const skip = (pageNum - 1) * take;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { user: { select: { whatsappPhone: true, name: true } }, fxRate: true },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.order.count({ where }),
  ]);

  res.json({ orders, total, page: pageNum, pages: Math.ceil(total / take) });
});

// GET /api/admin/orders/:id
ordersRouter.get('/:id', async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { user: true, fxRate: true },
  });
  if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
  res.json(order);
});

// PATCH /api/admin/orders/:id/status
const updateStatusSchema = z.object({
  status: z.enum(['PROCESSING', 'DELIVERED', 'FAILED', 'REFUNDED', 'CANCELLED']),
});

ordersRouter.patch('/:id/status', async (req: Request, res: Response) => {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { user: true },
  });
  if (!order) { res.status(404).json({ error: 'Order not found' }); return; }

  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: {
      status: parsed.data.status,
      ...(parsed.data.status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
    },
  });

  // Notify user if delivered
  if (parsed.data.status === 'DELIVERED') {
    const { notifyOrderDelivered } = await import('../../services/notification');
    notifyOrderDelivered({ ...updated, user: order.user }).catch(() => {});
  }

  res.json(updated);
});

// PATCH /api/admin/orders/:id/notes
ordersRouter.patch('/:id/notes', async (req: Request, res: Response) => {
  const { notes } = req.body as { notes?: string };
  if (typeof notes !== 'string') { res.status(400).json({ error: 'notes required' }); return; }

  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { adminNotes: notes },
  });
  res.json(updated);
});
