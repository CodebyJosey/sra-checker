'use client';
 
import { useState } from 'react';
import { useRouter } from 'next/navigation';
 
interface Props {
  readonly documentId: string;
}
 
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
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-foreground)] disabled:opacity-50"
      >
        {pending ? 'Bezig met evalueren…' : 'Evalueer'}
      </button>
      {error && <span className="text-xs text-[var(--danger)]">{error}</span>}
    </div>
  );
}
 