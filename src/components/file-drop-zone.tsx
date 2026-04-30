'use client';
 
import { useState, useRef, type ChangeEvent, type DragEvent } from 'react';
 
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
  readonly icon?: React.ReactNode;
}
 
export default function FileDropZone({
  label,
  sublabel,
  accept,
  endpoint,
  existing,
  onUploaded,
  icon,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
 
  async function uploadFile(file: File): Promise<void> {
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
 
  async function handleChange(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
  }
 
  function handleDrop(e: DragEvent<HTMLLabelElement>): void {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void uploadFile(file);
  }
 
  return (
    <div className="flex flex-col">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={
          'cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all ' +
          (pending
            ? 'border-[var(--border)] bg-[var(--surface-soft)] opacity-70'
            : dragOver
              ? 'border-[var(--foreground)] bg-[var(--surface-soft)] scale-[1.01]'
              : 'border-[var(--border)] bg-[var(--surface-soft)] hover:border-[var(--foreground)] hover:bg-[var(--surface)]')
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
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted)] ring-1 ring-[var(--border)]">
            {icon ?? <UploadIcon />}
          </div>
          <p className="text-sm font-medium">{pending ? 'Bezig met uploaden…' : label}</p>
          <p className="text-xs text-[var(--muted)]">
            {pending ? 'Een moment…' : `${sublabel} · klik of sleep hier`}
          </p>
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
              className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs"
            >
              <span className="flex items-center gap-2 truncate font-medium">
                <CheckIcon className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                {item.filename}
              </span>
              <span className="shrink-0 text-[var(--muted)]">{item.hint}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
 
function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
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
  );
}
 
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7 7a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4L9 11.6l6.3-6.3a1 1 0 0 1 1.4 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}
