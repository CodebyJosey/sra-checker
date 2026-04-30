'use client';

import { useState, useMemo } from 'react';
import StatusBadge from './status-badge';
import type { CheckStatus } from '@/domain/checklist/CheckResult';

export interface ResultRow {
  readonly id: string;
  readonly status: CheckStatus;
  readonly pageReference: number | null;
  readonly citation: string | null;
  readonly reasoning: string;
  readonly modelUsed: string;
  readonly checklistItem: {
    readonly id: string;
    readonly sheet: string;
    readonly ordering: number;
    readonly description: string;
    readonly source: string | null;
  };
}

type Filter = 'all' | 'PASS' | 'FAIL' | 'UNCERTAIN' | 'NOT_APPLICABLE';

const FILTERS: ReadonlyArray<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Alle' },
  { value: 'FAIL', label: 'Niet voldaan' },
  { value: 'UNCERTAIN', label: 'Onzeker' },
  { value: 'PASS', label: 'Voldaan' },
  { value: 'NOT_APPLICABLE', label: 'N.v.t.' },
];

export default function ResultsList({ results }: { results: ResultRow[] }) {
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(
    () => (filter === 'all' ? results : results.filter((r) => r.status === filter)),
    [results, filter],
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count =
            f.value === 'all' ? results.length : results.filter((r) => r.status === f.value).length;
          const isActive = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={
                'rounded-full border px-3 py-1 text-xs font-medium transition ' +
                (isActive
                  ? 'border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]'
                  : 'border-[var(--border)] hover:bg-[var(--surface-soft)]')
              }
            >
              {f.label}{' '}
              <span className={isActive ? 'opacity-70' : 'text-[var(--muted)]'}>{count}</span>
            </button>
          );
        })}
      </div>

      <ul className="mt-6 space-y-3">
        {filtered.length === 0 ? (
          <li className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
            Geen checks in deze categorie.
          </li>
        ) : (
          filtered.map((r) => <ResultRowItem key={r.id} row={r} />)
        )}
      </ul>
    </div>
  );
}

function ResultRowItem({ row }: { row: ResultRow }) {
  return (
    <li className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start gap-3 p-4">
          <StatusBadge status={row.status} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm">{row.checklistItem.description}</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
              {row.checklistItem.source && <span>{row.checklistItem.source}</span>}
              {row.pageReference !== null && (
                <>
                  <span aria-hidden>·</span>
                  <span>pagina {row.pageReference}</span>
                </>
              )}
            </p>
          </div>
          <span className="shrink-0 text-xs text-[var(--muted)] group-open:rotate-180">▾</span>
        </summary>

        <div className="space-y-3 border-t border-[var(--border)] px-4 py-3 text-sm">
          <div>
            <p className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
              Onderbouwing
            </p>
            <p className="mt-1 leading-relaxed">{row.reasoning}</p>
          </div>

          {row.citation && (
            <div>
              <p className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
                Citaat uit de jaarrekening
              </p>
              <blockquote className="mt-1 border-l-2 border-[var(--border)] pl-3 text-[var(--muted)] italic">
                &ldquo;{row.citation}&rdquo;
              </blockquote>
            </div>
          )}

          <p className="text-xs text-[var(--muted)]">
            Beoordeeld door{' '}
            <code className="rounded bg-[var(--surface-soft)] px-1">{row.modelUsed}</code>
          </p>
        </div>
      </details>
    </li>
  );
}
