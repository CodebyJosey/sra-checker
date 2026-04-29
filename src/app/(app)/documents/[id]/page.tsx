import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/infrastructure/auth/auth';
import { prisma } from '@/infrastructure/persistence/prisma';
import { DocumentRepository } from '@/infrastructure/persistence/DocumentRepository';
import { CheckResultRepository } from '@/infrastructure/persistence/CheckResultRepository';
import RunChecksButton from '@/components/run-checks-button';
import ResultsList, { type ResultRow } from '@/components/results-list';
import type { CheckStatus } from '@/domain/checklist/CheckResult';
 
interface PageProps {
  readonly params: Promise<{ id: string }>;
}
 
export default async function DocumentDetailPage({ params }: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
 
  const { id } = await params;
 
  const documentRepo = new DocumentRepository(prisma);
  const document = await documentRepo.findOwned(id, session.user.id);
  if (!document) notFound();
 
  const resultsRepo = new CheckResultRepository(prisma);
  const [rawResults, counts] = await Promise.all([
    resultsRepo.findByDocument(document.id),
    resultsRepo.statusCounts(document.id),
  ]);
 
  const results: ResultRow[] = rawResults.map((r) => ({
    id: r.id,
    status: r.status as CheckStatus,
    pageReference: r.pageReference,
    citation: r.citation,
    reasoning: r.reasoning,
    modelUsed: r.modelUsed,
    checklistItem: {
      id: r.checklistItem.id,
      sheet: r.checklistItem.sheet,
      ordering: r.checklistItem.ordering,
      description: r.checklistItem.description,
      source: r.checklistItem.source,
    },
  }));
 
  const total = counts.PASS + counts.FAIL + counts.NOT_APPLICABLE + counts.UNCERTAIN;
 
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/dashboard"
        className="text-xs text-[var(--muted)] underline-offset-4 hover:underline"
      >
        ← Terug naar dashboard
      </Link>
 
      <header className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {document.filename}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {document.pageCount} pagina&apos;s · geüpload{' '}
            {new Date(document.createdAt).toLocaleString('nl-NL')}
          </p>
        </div>
        <RunChecksButton documentId={document.id} />
      </header>
 
      {total === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
          Nog niet geëvalueerd. Klik op <strong>Evalueer</strong> om de SRA-checks te draaien.
        </div>
      ) : (
        <>
          <SummaryStats counts={counts} total={total} />
          <section className="mt-8">
            <ResultsList results={results} />
          </section>
        </>
      )}
    </main>
  );
}
 
function SummaryStats({
  counts,
  total,
}: {
  counts: Record<CheckStatus, number>;
  total: number;
}) {
  const items: ReadonlyArray<{ key: CheckStatus; label: string; color: string }> = [
    { key: 'PASS', label: 'Voldaan', color: 'text-green-700' },
    { key: 'FAIL', label: 'Niet voldaan', color: 'text-red-700' },
    { key: 'UNCERTAIN', label: 'Onzeker', color: 'text-amber-700' },
    { key: 'NOT_APPLICABLE', label: 'N.v.t.', color: 'text-gray-600' },
  ];
 
  return (
    <section className="mt-8 grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--border)] text-center">
      {items.map((item) => (
        <div key={item.key} className="bg-[var(--surface)] px-3 py-4">
          <p className={`text-2xl font-semibold tracking-tight ${item.color}`}>
            {counts[item.key]}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">{item.label}</p>
        </div>
      ))}
      <div className="col-span-4 -mt-px border-t border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2 text-xs text-[var(--muted)]">
        {total} checks geëvalueerd
      </div>
    </section>
  );
}
 