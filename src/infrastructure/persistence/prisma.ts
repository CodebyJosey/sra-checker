/**
 * @summary Singleton-export van de Prisma-client.
 *
 * @remarks
 * Next.js' development mode hot-reload zou anders bij elke wijziging een
 * nieuwe `PrismaClient` instantieren — dat lekt connecties richting SQLite
 * en geeft "too many connections"-fouten. Door de instantie aan
 * `globalThis` te hangen (alleen in dev) hergebruiken we hem.
 *
 * @example
 * ```ts
 * import { prisma } from '@/infrastructure/persistence/prisma';
 *
 * const docs = await prisma.document.findMany({ where: { userId } });
 * ```
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
