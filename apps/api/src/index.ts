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
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
// Explicitly handle all preflight OPTIONS requests — this terminates the request
// with 204 + Access-Control-Allow-Methods before it reaches any route handler.
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

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

// ─── Paystack payment callback ────────────────────────────────────────────────
// Paystack redirects here after the user completes payment on their hosted page.
// The actual order state update happens via webhook (async). This page just
// reassures the user and tells them to check WhatsApp.
app.get('/payment/success', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Received — Yonda</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f9fafb;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px 32px;
      text-align: center;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06);
    }
    .icon {
      font-size: 52px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 12px;
    }
    p {
      font-size: 15px;
      color: #6b7280;
      line-height: 1.6;
      margin-bottom: 8px;
    }
    .highlight {
      color: #111827;
      font-weight: 600;
    }
    .whatsapp-note {
      margin-top: 28px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 16px;
      font-size: 14px;
      color: #166534;
    }
    .brand {
      margin-top: 32px;
      font-size: 13px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Payment received</h1>
    <p>Your payment has gone through successfully.</p>
    <p>We're processing your <span class="highlight">RMB order</span> now.</p>
    <div class="whatsapp-note">
      Check your <strong>WhatsApp</strong> — Kai will send you a confirmation and delivery update shortly.
    </div>
    <p class="brand">Yonda · China payments made easy</p>
  </div>
</body>
</html>`);
});

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
