/**
 * @summary `POST /api/documents/[id]/run` — start een evaluatie van alle i+d-checks.
 *
 * @remarks
 * - Auth + ownership-check zit ingebakken (defense in depth bovenop middleware).
 * - Synchroon: wacht totdat alle checks klaar zijn voordat we 200 returnen.
 *   Voor 39 checks bij batches van 5 is dat ~30-60 seconden.
 * - Geen rate-limit per gebruiker (zou je in productie wel willen).
 */
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/infrastructure/auth/auth';
import { prisma } from '@/infrastructure/persistence/prisma';
import { DocumentRepository } from '@/infrastructure/persistence/DocumentRepository';
import { ChecklistRepository } from '@/infrastructure/persistence/ChecklistRepository';
import { CheckResultRepository } from '@/infrastructure/persistence/CheckResultRepository';
import { EmbeddingService } from '@/infrastructure/ai/EmbeddingService';
import { AnthropicProvider } from '@/infrastructure/ai/AnthropicProvider';
import { DocumentRetriever } from '@/infrastructure/rag/DocumentRetriever';
import { RunChecksUseCase } from '@/application/RunChecksUseCase';
 
// Een enkele run kan minuten duren. Op Vercel zou dit naar een queue moeten;
// lokaal werkt het out-of-the-box.
export const maxDuration = 300; // seconden
 
interface RouteContext {
  readonly params: Promise<{ id: string }>;
}
 
export async function POST(_req: Request, ctx: RouteContext): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
 
  const { id } = await ctx.params;
  const repo = new DocumentRepository(prisma);
  const document = await repo.findOwned(id, session.user.id);
  if (!document) {
    // Bewust 404 i.p.v. 403 — geeft minder informatie weg over wel/niet bestaande IDs.
    return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });
  }
 
  const useCase = new RunChecksUseCase(
    new DocumentRetriever(prisma, new EmbeddingService()),
    new AnthropicProvider(),
    new ChecklistRepository(prisma),
    new CheckResultRepository(prisma),
  );
 
  try {
    const summary = await useCase.execute(document.id, 'midden');
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
 