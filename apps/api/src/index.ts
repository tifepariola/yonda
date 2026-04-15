import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import getConfig from './config';
import logger from './lib/logger';
import { connectDB, disconnectDB } from './lib/prisma';
import { connectRedis, disconnectRedis } from './lib/redis';
import { apiRouter } from './api/index';
import { startOrderTimeoutWorker } from './jobs/queue';

const app = express();

// ─── Raw body capture (required for webhook signature verification) ──────────
app.use(
  express.json({
    verify: (req: Request & { rawBody?: Buffer }, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// ─── CORS (admin dashboard) ──────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  // Respond to preflight requests immediately — without this the OPTIONS
  // request falls through to the 404 handler and the browser blocks the call.
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

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
