import Redis from 'ioredis';
import logger from './logger';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
});

export const redisForBull = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error({ err }, 'Redis error'));

export async function connectRedis(): Promise<void> {
  await redis.connect();
  await redisForBull.connect();
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  await redisForBull.quit();
  logger.info('Redis disconnected');
}

export default redis;
