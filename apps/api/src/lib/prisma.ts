import { PrismaClient } from '@prisma/client';
import logger from './logger';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function connectDB(): Promise<void> {
  await prisma.$connect();
  logger.info('PostgreSQL connected');
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
  logger.info('PostgreSQL disconnected');
}

export default prisma;
