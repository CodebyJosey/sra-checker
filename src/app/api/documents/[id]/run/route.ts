/**
 * @summary `POST /api/documents/[id]/run` — start een evaluatie en streamt voortgang.
 *
 * @remarks
 * Antwoord is **NDJSON** (newline-delimited JSON). Elke regel is een event:
 * - `{ "succeeded": n, "failed": m, "total": t }` — voortgang
 * - `{ "done": true, "succeeded": n, "failed": m, "total": t }` — klaar
 * - `{ "error": "..." }` — fout
 */
import { headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/infrastructure/auth/auth';
import { prisma } from '@/infrastructure/persistence/prisma';
import { DocumentRepository } from '@/infrastructure/persistence/DocumentRepository';
import { ChecklistRepository } from '@/infrastructure/persistence/ChecklistRepository';
import { CheckResultRepository } from '@/infrastructure/persistence/CheckResultRepository';
import { EmbeddingService } from '@/infrastructure/ai/EmbeddingService';
import { AnthropicProvider } from '@/infrastructure/ai/AnthropicProvider';
import { DocumentRetriever } from '@/infrastructure/rag/DocumentRetriever';
import { RunChecksUseCase } from '@/application/RunChecksUseCase';
import { runLimiter } from '@/lib/rate-limiter';

export const dyanmic = 'force-dynamic';

export const maxDuration = 300;

const BodySchema = z.object({
  checklistId: z.string().min(1),
  sheet: z.string().min(1),
  type: z.enum(['groot', 'midden', 'klein']).default('midden'),
});

interface RouteContext {
  readonly params: Promise<{ id: string }>;
}

export async function POST(req: Request, ctx: RouteContext): Promise<Response> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return jsonError(401, 'Niet ingelogd');

  const decision = runLimiter.check(`run:${session.user.id}`);
  if (!decision.allowed) {
    const seconds = Math.ceil((decision.resetAt - Date.now()) / 1000);
    return new Response(
      JSON.stringify({ error: `Te veel evaluaties. Probeer over ${seconds}s opnieuw.` }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(seconds),
        },
      },
    );
  }

  const { id } = await ctx.params;

  const documentRepo = new DocumentRepository(prisma);
  const document = await documentRepo.findOwned(id, session.user.id);
  if (!document) return jsonError(404, 'Niet gevonden');

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, 'Ongeldige body');

  const checklistRepo = new ChecklistRepository(prisma);
  const checklist = await checklistRepo.findOwned(parsed.data.checklistId, session.user.id);
  if (!checklist) return jsonError(404, 'Checklist niet gevonden');

  const useCase = new RunChecksUseCase(
    new DocumentRetriever(prisma, new EmbeddingService()),
    new AnthropicProvider(),
    checklistRepo,
    new CheckResultRepository(prisma),
  );

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: object): void => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      };

      try {
        const summary = await useCase.execute(
          document.id,
          parsed.data.checklistId,
          parsed.data.sheet,
          parsed.data.type,
          (progress) => send(progress),
        );
        send({ done: true, ...summary });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Onbekende fout';
        send({ error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
