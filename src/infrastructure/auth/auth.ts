/**
 * @summary Server-side BetterAuth-instantie voor de hele applicatie.
 *
 * @remarks
 * Wordt geconfigureerd met de Prisma-adapter zodat sessies en accounts in
 * onze SQLite-DB worden bewaard. Email/password is bewust de enige flow:
 * voor een case is dat genoeg en het scheelt OAuth-redirect-complexiteit.
 *
 * Dit bestand mag NOOIT in een client component worden geïmporteerd.
 * Voor client-zijde gebruik je `auth-client.ts`.
 */
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '../persistence/prisma';

const secret = process.env['BETTER_AUTH_SECRET'];
if (!secret) {
  throw new Error('BETTER_AUTH_SECRET ontbreekt in .env.local');
}

const baseUrl = process.env['BETTER_AUTH_URL'];
if (!baseUrl) {
  throw new Error('BETTER_AUTH_URL ontbreekt in .env.local');
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'sqlite' }),
  secret,
  baseURL: baseUrl,
  emailAndPassword: {
    enabled: true,
    /**
     * `requireEmailVerification: false` is bewust gekozen voor de case —
     * we hebben geen mailer aangesloten. In productie zou dit `true` zijn,
     * met een verstuurde magic-link en de Verification-tabel ingezet.
     */
    requireEmailVerification: false,
    minPasswordLength: 10,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 dagen
    updateAge: 60 * 60 * 24, // refresh elke dag
  },
  advanced: {
    cookiePrefix: 'sra-checker',
  },
});
