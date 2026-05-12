import { Router, Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import getConfig from '../../config';
import logger from '../../lib/logger';
import prisma from '../../lib/prisma';
import { notifyPaymentReceived } from '../../services/notification';
import { saveSession, idleSession } from '../../bot/session';
import type { NombaWebhookPayload } from '../../types/nomba';

export const nombaWebhookRouter = Router();

nombaWebhookRouter.post('/', async (req: Request, res: Response) => {
  res.sendStatus(200);

  const config = getConfig();
  const signature = req.headers['x-nomba-signature'] as string | undefined;

  if (config.NOMBA_WEBHOOK_SECRET) {
    if (!signature) {
      logger.warn('Missing Nomba webhook signature');
      return;
    }
    const rawBody: Buffer =
      (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body));
    const expected = createHmac('sha512', config.NOMBA_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');
    try {
      if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        logger.warn('Invalid Nomba webhook signature');
        return;
      }
    } catch {
      logger.warn('Nomba webhook signature comparison failed');
      return;
    }
  }

  const payload = req.body as NombaWebhookPayload;
  logger.info({ event: payload.event }, 'Nomba webhook received');

  try {
    if (payload.event === 'payment_success') {
      await handlePaymentSuccess(payload);
    }
  } catch (err) {
    logger.error({ err, event: payload.event }, 'Error processing Nomba webhook');
  }
});

async function handlePaymentSuccess(payload: NombaWebhookPayload): Promise<void> {
  const { orderReference, amount } = payload.data;

  const order = await prisma.order.findUnique({
    where: { nombaOrderRef: orderReference },
    include: { user: true },
  });

  if (!order) {
    logger.warn({ orderReference }, 'Nomba webhook: order not found');
    return;
  }

  if (order.status !== 'PENDING_PAYMENT') {
    logger.info({ orderReference, status: order.status }, 'Nomba webhook: order already processed');
    return;
  }

  const paidNgn = amount;
  const expectedNgn = Number(order.ngnAmount);
  if (Math.abs(paidNgn - expectedNgn) > 1) {
    logger.error(
      { orderReference, paidNgn, expectedNgn },
      'Nomba webhook: amount mismatch — manual review required',
    );
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        adminNotes: `AMOUNT MISMATCH: paid ₦${paidNgn}, expected ₦${expectedNgn}`,
      },
    });
    await saveSession(order.user.whatsappPhone, idleSession(order.user.id));
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'PAID', paidAt: new Date() },
  });

  logger.info({ orderId: order.id, orderReference }, 'Order marked as PAID via Nomba');

  await saveSession(order.user.whatsappPhone, idleSession(order.user.id));
  await notifyPaymentReceived(order);
}
