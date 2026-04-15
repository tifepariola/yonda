import { Queue, Worker } from 'bullmq';
import { redisForBull } from '../lib/redis';
import logger from '../lib/logger';

// ─── Order Timeout Queue ──────────────────────────────────────────────────────

let orderTimeoutQueue: Queue | null = null;

export function getOrderTimeoutQueue(): Queue {
  if (!orderTimeoutQueue) {
    orderTimeoutQueue = new Queue('order-timeout', { connection: redisForBull });
  }
  return orderTimeoutQueue;
}

export function startOrderTimeoutWorker(): Worker {
  const worker = new Worker(
    'order-timeout',
    async (job) => {
      const { orderId } = job.data as { orderId: string };
      const { prisma } = await import('../lib/prisma');
      const { notifyPaymentExpired } = await import('../services/notification');

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true },
      });

      if (!order || order.status !== 'PENDING_PAYMENT') {
        logger.info({ orderId }, 'Order timeout: already resolved, skipping');
        return;
      }

      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      await notifyPaymentExpired(order);
      logger.info({ orderId }, 'Order expired and user notified');
    },
    {
      connection: redisForBull,
      concurrency: 5,
    },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Order timeout job failed');
  });

  return worker;
}
