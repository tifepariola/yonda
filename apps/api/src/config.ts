import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  META_WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  META_WHATSAPP_ACCESS_TOKEN: z.string().min(1),
  META_WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  META_WHATSAPP_APP_SECRET: z.string().min(1),

  PAYSTACK_SECRET_KEY: z.string().min(1),

  ENCRYPTION_KEY: z.string().length(64),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('8h'),

  ADMIN_DASHBOARD_URL: z.string().default('http://localhost:3001'),

  MIN_CNY_AMOUNT: z.coerce.number().default(100),
  MAX_CNY_AMOUNT: z.coerce.number().default(50000),
  PAYMENT_LINK_TTL_HOURS: z.coerce.number().default(2),
  SESSION_TTL_SECONDS: z.coerce.number().default(86400),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.errors
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${missing}`);
  }
  return result.data;
}

// Lazy singleton — only validated when first accessed
let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) _config = loadConfig();
  return _config;
}

export default getConfig;
