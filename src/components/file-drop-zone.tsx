'use client';
 
import { useState, useRef, type ChangeEvent } from 'react';
 
interface ExistingItem {
  readonly id: string;
  readonly filename: string;
  readonly hint: string;
}
 
interface Props {
  readonly label: string;
  readonly sublabel: string;
  readonly accept: string;
  readonly endpoint: string;
  readonly existing: readonly ExistingItem[];
  readonly onUploaded: () => void;
}
 
/**
 * Eén upload-zone met klikbare drop-area en lijst van al-geüploade bestanden.
 */
export default function FileDropZone({
  label,
  sublabel,
  accept,
  endpoint,
  existing,
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
 
  async function handleChange(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPending(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(endpoint, { method: 'POST', body: fd });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Upload mislukt (${res.status})`);
        return;
      }
      if (inputRef.current) inputRef.current.value = '';
      onUploaded();
    } finally {
      setPending(false);
    }
  }
 
  return (
    <div className="flex flex-col">
      <label
        className={
          'cursor-pointer rounded-lg border border-dashed px-4 py-6 text-center transition ' +
          (pending
            ? 'border-[var(--border)] bg-[var(--surface-soft)]'
            : 'border-[var(--border)] bg-[var(--surface-soft)] hover:border-[var(--foreground)] hover:bg-white')
        }
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          disabled={pending}
          className="sr-only"
        />
        <div className="flex flex-col items-center gap-1">
          <svg
            className="h-6 w-6 text-[var(--muted)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="text-sm font-medium">{pending ? 'Bezig met uploaden…' : label}</p>
          <p className="text-xs text-[var(--muted)]">{sublabel}</p>
        </div>
      </label>
 
      {error && (
        <p role="alert" className="mt-2 text-xs text-[var(--danger)]">
          {error}
        </p>
      )}
 
      {existing.length > 0 && (
        <ul className="mt-3 space-y-1">
          {existing.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded border border-[var(--border)] bg-white px-3 py-2 text-xs"
            >
              <span className="truncate font-medium">{item.filename}</span>
              <span className="shrink-0 text-[var(--muted)]">{item.hint}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
 