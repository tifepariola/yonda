import { Router, Request, Response } from 'express';
import getConfig from '../../config';
import logger from '../../lib/logger';
import { verifyHmacSha512 } from '../../lib/crypto';
import prisma from '../../lib/prisma';
import { notifyPaymentReceived } from '../../services/notification';
import type { PaystackWebhookPayload } from '../../types/paystack';

export const paystackWebhookRouter = Router();

paystackWebhookRouter.post('/', async (req: Request, res: Response) => {
  // Respond 200 immediately
  res.sendStatus(200);

  const config = getConfig();
  const signature = req.headers['x-paystack-signature'] as string | undefined;

  if (!signature) {
    logger.warn('Missing Paystack webhook signature');
    return;
  }

  const rawBody: Buffer = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body));
  const valid = verifyHmacSha512(config.PAYSTACK_SECRET_KEY, rawBody, signature);
  if (!valid) {
    logger.warn('Invalid Paystack webhook signature');
    return;
  }

  const payload = req.body as PaystackWebhookPayload;
  logger.info({ event: payload.event }, 'Paystack webhook received');

  try {
    if (payload.event === 'charge.success') {
      await handleChargeSuccess(payload);
    }
  } catch (err) {
    logger.error({ err, event: payload.event }, 'Error processing Paystack webhook');
  }
});

async function handleChargeSuccess(payload: PaystackWebhookPayload): Promise<void> {
  const { reference, amount } = payload.data;

  const order = await prisma.order.findUnique({
    where: { paystackRef: reference },
    include: { user: true },
  });

  if (!order) {
    logger.warn({ reference }, 'Paystack webhook: order not found');
    return;
  }

  // Idempotency check
  if (order.status !== 'PENDING_PAYMENT') {
    logger.info({ reference, status: order.status }, 'Paystack webhook: order already processed');
    return;
  }

  // Amount validation (Paystack sends kobo, we store naira)
  const paidNgn = amount / 100;
  const expectedNgn = Number(order.ngnAmount);
  if (Math.abs(paidNgn - expectedNgn) > 1) {
    logger.error(
      { reference, paidNgn, expectedNgn },
      'Paystack webhook: amount mismatch — manual review required',
    );
    // Still mark as PAID but flag with note
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        adminNotes: `AMOUNT MISMATCH: paid ₦${paidNgn}, expected ₦${expectedNgn}`,
      },
    });
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'PAID', paidAt: new Date() },
  });

  logger.info({ orderId: order.id, reference }, 'Order marked as PAID');

  // Notify user via WhatsApp
  await notifyPaymentReceived(order);
}
