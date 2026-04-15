import prisma from '../lib/prisma';
import redis from '../lib/redis';
import logger from '../lib/logger';

const RATE_CACHE_KEY = 'fx:active_rate';
const RATE_CACHE_TTL = 60; // seconds

interface ActiveRate {
  id: string;
  baseRateCnyToNgn: number;
  marginPercent: number;
  effectiveRateCnyToNgn: number;
}

export interface RateQuote {
  cnyAmount: number;
  ngnAmount: number;       // What the customer pays
  exchangeRate: number;    // Effective rate applied
  marginRate: number;      // Margin as decimal (e.g. 0.05)
  rateId: string;
}

export async function getActiveRate(): Promise<ActiveRate> {
  // Try cache first
  const cached = await redis.get(RATE_CACHE_KEY);
  if (cached) {
    return JSON.parse(cached) as ActiveRate;
  }

  const rate = await prisma.fxRate.findFirst({ where: { isActive: true } });
  if (!rate) {
    throw new Error('No active FX rate configured. Please set a rate in the admin panel.');
  }

  const result: ActiveRate = {
    id: rate.id,
    baseRateCnyToNgn: Number(rate.baseRateCnyToNgn),
    marginPercent: Number(rate.marginPercent),
    effectiveRateCnyToNgn: Number(rate.effectiveRateCnyToNgn),
  };

  await redis.set(RATE_CACHE_KEY, JSON.stringify(result), 'EX', RATE_CACHE_TTL);
  return result;
}

export async function invalidateRateCache(): Promise<void> {
  await redis.del(RATE_CACHE_KEY);
}

export async function calculateQuote(cnyAmount: number): Promise<RateQuote> {
  const rate = await getActiveRate();

  // NGN amount = CNY × effective rate, rounded up to nearest naira
  const rawNgn = cnyAmount * rate.effectiveRateCnyToNgn;
  const ngnAmount = Math.ceil(rawNgn);

  return {
    cnyAmount,
    ngnAmount,
    exchangeRate: rate.effectiveRateCnyToNgn,
    marginRate: rate.marginPercent,
    rateId: rate.id,
  };
}

/**
 * Create a new active FX rate and deactivate the previous one.
 * Returns the newly created rate.
 */
export async function setActiveRate(params: {
  baseRateCnyToNgn: number;
  marginPercent: number;
  adminId: string;
}): Promise<ActiveRate> {
  const { baseRateCnyToNgn, marginPercent, adminId } = params;
  const effectiveRateCnyToNgn = baseRateCnyToNgn * (1 + marginPercent);

  const [, newRate] = await prisma.$transaction([
    prisma.fxRate.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.fxRate.create({
      data: {
        baseRateCnyToNgn,
        marginPercent,
        effectiveRateCnyToNgn,
        isActive: true,
        setByAdminId: adminId,
      },
    }),
  ]);

  await invalidateRateCache();

  logger.info({ rateId: newRate.id, effectiveRateCnyToNgn }, 'FX rate updated');

  return {
    id: newRate.id,
    baseRateCnyToNgn: Number(newRate.baseRateCnyToNgn),
    marginPercent: Number(newRate.marginPercent),
    effectiveRateCnyToNgn: Number(newRate.effectiveRateCnyToNgn),
  };
}
