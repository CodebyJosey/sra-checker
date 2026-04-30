/**
 * @summary REST endpoint voor documenten.
 *
 * @remarks
 * - `POST /api/documents` — upload een nieuwe jaarrekening (multipart/form-data, veld `file`).
 * - `GET  /api/documents` — lijst van eigen documenten.
 *
 * Auth + ownership-check zijn defense-in-depth: middleware doet een
 * cookie-check, hier doen we de echte sessie-validatie en filteren we
 * altijd op de huidige user.
 */
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/infrastructure/auth/auth';
import { prisma } from '@/infrastructure/persistence/prisma';
import { DocumentRepository } from '@/infrastructure/persistence/DocumentRepository';
import { PdfExtractor } from '@/infrastructure/parsing/PdfExtractor';
import { IngestDocumentUseCase } from '@/application/IngestDocumentUseCase';
import { EmbeddingService } from '@/infrastructure/ai/EmbeddingService';
import { Chunker } from '@/infrastructure/rag/Chunker';
import { uploadLimiter } from '@/lib/rate-limiter';

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME = 'application/pdf';

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const decision = uploadLimiter.check(`upload:${session.user.id}`);
  if (!decision.allowed) {
    return NextResponse.json({ error: 'Te veel uploads, probeer later' }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Ongeldige multipart-body' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Veld `file` ontbreekt' }, { status: 400 });
  }
  if (file.type !== ALLOWED_MIME) {
    return NextResponse.json({ error: 'Alleen PDF-bestanden toegestaan' }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Bestand groter dan 20 MB' }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  const useCase = new IngestDocumentUseCase(
    new PdfExtractor(),
    new DocumentRepository(prisma),
    new Chunker(),
    new EmbeddingService(),
  );

  try {
    const result = await useCase.execute({
      userId: session.user.id,
      originalFilename: file.name,
      mimeType: file.type,
      bytes,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

export async function GET(): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const repo = new DocumentRepository(prisma);
  const docs = await repo.findByUser(session.user.id);
  return NextResponse.json(docs);
}
