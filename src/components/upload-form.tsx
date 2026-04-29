'use client';
 
import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
 
export default function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
 
  function handleFileChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    setFilename(file ? file.name : null);
    setError(null);
  }
 
  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Kies eerst een PDF-bestand.');
      return;
    }
 
    const formData = new FormData();
    formData.append('file', file);
 
    setPending(true);
    const res = await fetch('/api/documents', { method: 'POST', body: formData });
    setPending(false);
 
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? `Upload mislukt (${res.status})`);
      return;
    }
 
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFilename(null);
    router.refresh();
  }
 
  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6"
      encType="multipart/form-data"
    >
      <label
        htmlFor="file"
        className="block cursor-pointer rounded-md border border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-8 text-center text-sm transition hover:bg-white"
      >
        {filename ? (
          <span className="font-medium">{filename}</span>
        ) : (
          <>
            <span className="font-medium">Klik om een PDF te kiezen</span>
            <p className="mt-1 text-xs text-[var(--muted)]">PDF, maximaal 20 MB</p>
          </>
        )}
        <input
          ref={fileInputRef}
          id="file"
          type="file"
          name="file"
          accept="application/pdf"
          required
          onChange={handleFileChange}
          className="sr-only"
        />
      </label>
 
      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
 
      <button
        type="submit"
        disabled={pending || !filename}
        className="mt-4 w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Bezig met uploaden…' : 'Upload jaarrekening'}
      </button>
    </form>
  );
}
 