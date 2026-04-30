/**
 * @summary `POST /api/checklists` — upload een nieuwe SRA-checklist (.xlsm).
 *          `GET  /api/checklists` — lijst van eigen checklists.
 */
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/infrastructure/auth/auth';
import { prisma } from '@/infrastructure/persistence/prisma';
import { ChecklistRepository } from '@/infrastructure/persistence/ChecklistRepository';
import { ChecklistImporter } from '@/infrastructure/parsing/ChecklistImporter';
import { ImportChecklistUseCase } from '@/application/ImportChecklistUseCase';
import { uploadLimiter } from '@/lib/rate-limiter';
 
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/vnd.ms-excel.sheet.macroenabled.12', // .xlsm
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/octet-stream', // sommige browsers sturen dit voor .xlsm
]);
 
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
 
  // Naast MIME ook extensie checken — Windows is wisselvallig.
  const isExcelExt = /\.(xlsm|xlsx)$/i.test(file.name);
  if (!isExcelExt && !ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Alleen .xlsm of .xlsx bestanden toegestaan' },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Bestand groter dan 10 MB' }, { status: 413 });
  }
 
  const bytes = Buffer.from(await file.arrayBuffer());
  const displayName =
    typeof formData.get('name') === 'string' && (formData.get('name') as string).trim().length > 0
      ? (formData.get('name') as string).trim()
      : file.name.replace(/\.(xlsm|xlsx)$/i, '');
 
  const useCase = new ImportChecklistUseCase(
    new ChecklistImporter(),
    new ChecklistRepository(prisma as any),
  );
 
  try {
    const result = await useCase.execute({
      userId: session.user.id,
      displayName,
      filename: file.name,
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
 
  const repo = new ChecklistRepository(prisma as any);
  const checklists = await repo.listByUser(session.user.id);
  return NextResponse.json(checklists);
}
 