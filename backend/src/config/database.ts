import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const logLevels: ('query' | 'error' | 'warn' | 'info')[] =
  process.env.NODE_ENV !== 'production'
    ? [{ emit: 'event', level: 'query' } as any, { emit: 'event', level: 'error' } as any, { emit: 'event', level: 'warn' } as any]
    : [{ emit: 'event', level: 'error' } as any];

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: logLevels,
  });

if (process.env.NODE_ENV !== 'production') {
  (prisma as any).$on('query', (e: { query: string; params: string; duration: number }) => {
    logger.debug(`Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
  });
}

(prisma as any).$on('error', (e: { message: string }) => {
  logger.error(`Prisma error: ${e.message}`);
});

(prisma as any).$on('warn', (e: { message: string }) => {
  logger.warn(`Prisma warning: ${e.message}`);
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('Database connected successfully');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
