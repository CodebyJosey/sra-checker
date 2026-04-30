'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  readonly documentId: string;
}

/**
 * @summary Knop die de evaluatie start, met een full-screen overlay tijdens de run.
 *
 * @remarks
 * Een eval-run duurt 30-90 sec; een simpele "disabled"-knop voelt dan stil.
 * De overlay communiceert dat het systeem aan het werk is en welke verwachting
 * de gebruiker mag hebben.
 */
export default function RunChecksButton({ documentId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(): Promise<void> {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/run`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Run mislukt (${res.status})`);
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleClick}
          disabled={pending}
          className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-foreground)] disabled:opacity-50"
        >
          {pending ? 'Bezig…' : 'Evalueer'}
        </button>
        {error && <span className="text-xs text-[var(--danger)]">{error}</span>}
      </div>

      {pending && <EvaluationOverlay />}
    </>
  );
}

function EvaluationOverlay() {
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Evaluatie loopt"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    >
      <div className="mx-4 w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-lg">
        <Spinner />
        <h2 className="mt-4 text-base font-semibold tracking-tight">Bezig met evalueren</h2>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          Claude beoordeelt de jaarrekening op alle SRA-checks.
          <br />
          Dit duurt ongeveer 30-90 seconden.
        </p>
        <p className="mt-4 text-xs text-[var(--muted)]">
          Sluit dit venster niet — de resultaten verschijnen vanzelf.
        </p>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="mx-auto h-8 w-8 animate-spin text-[var(--foreground)]"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4z" />
    </svg>
  );
}
