import express from 'express';
import cors from 'cors';
import type { Request, Response, NextFunction } from 'express';
import getConfig from './config';
import logger from './lib/logger';
import { connectDB, disconnectDB } from './lib/prisma';
import { connectRedis, disconnectRedis } from './lib/redis';
import { apiRouter } from './api/index';
import { startOrderTimeoutWorker } from './jobs/queue';

const app = express();

// ─── CORS — must be first so preflight OPTIONS requests are handled before
//     express.json() runs and before any error handler can intercept them. ────
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));

// ─── Raw body capture (required for webhook signature verification) ──────────
app.use(
  express.json({
    verify: (req: Request & { rawBody?: Buffer }, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.use('/api', apiRouter);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Global error handler ────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Startup ─────────────────────────────────────────────────────────────────
async function start(): Promise<void> {
  const config = getConfig();

  await connectDB();
  await connectRedis();

  // Start background workers
  startOrderTimeoutWorker();

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'Yonda API started');
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down...');
    server.close(async () => {
      await disconnectDB();
      await disconnectRedis();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  // Print plainly so Railway surfaces the actual reason (e.g. missing env vars)
  console.error('\n❌ Failed to start server:\n', message, '\n');
  process.exit(1);
});
