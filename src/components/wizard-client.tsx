'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Stepper, { type Step } from './stepper';
import FileDropZone from './file-drop-zone';

interface SheetInfo {
  readonly name: string;
  readonly idCount: number;
}

export interface ChecklistOption {
  readonly id: string;
  readonly name: string;
  readonly filename: string;
  readonly sheets: readonly SheetInfo[];
}

export interface DocumentOption {
  readonly id: string;
  readonly filename: string;
  readonly pageCount: number;
}

interface Props {
  readonly initialChecklists: readonly ChecklistOption[];
  readonly initialDocuments: readonly DocumentOption[];
}

type StepId = 'upload' | 'process' | 'results';

interface RunSummary {
  readonly succeeded: number;
  readonly failed: number;
  readonly total: number;
  readonly documentId: string;
}

export default function WizardClient({ initialChecklists, initialDocuments }: Props) {
  const router = useRouter();

  const [step, setStep] = useState<StepId>(
    initialChecklists.length > 0 && initialDocuments.length > 0 ? 'process' : 'upload',
  );

  // Voor de selectors gebruiken we de meest-recent geüploade items als default.
  const [checklistId, setChecklistId] = useState<string>(initialChecklists[0]?.id ?? '');
  const [documentId, setDocumentId] = useState<string>(initialDocuments[0]?.id ?? '');
  const [sheet, setSheet] = useState<string>('');

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RunSummary | null>(null);

  const selectedChecklist = useMemo(
    () => initialChecklists.find((c) => c.id === checklistId) ?? null,
    [initialChecklists, checklistId],
  );
  const selectedDocument = useMemo(
    () => initialDocuments.find((d) => d.id === documentId) ?? null,
    [initialDocuments, documentId],
  );

  const hasUploads = initialChecklists.length > 0 && initialDocuments.length > 0;
  const canRun = hasUploads && checklistId !== '' && documentId !== '' && sheet !== '';

  const steps: Step[] = [
    { id: 'upload', label: 'Upload files', state: stateOf('upload', step, hasUploads, summary) },
    { id: 'process', label: 'Process', state: stateOf('process', step, hasUploads, summary) },
    { id: 'results', label: 'Resultaten', state: stateOf('results', step, hasUploads, summary) },
  ];

  async function handleStart(): Promise<void> {
    if (!canRun) return;
    setError(null);
    setSummary(null);
    setRunning(true);
    setProgress({ done: 0, total: 0 });

    try {
      const res = await fetch(`/api/documents/${documentId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Type rechtspersoon: voor het MKB is 'midden' verreweg het meest voorkomend.
        // De gebruiker hoeft hier niet over na te denken.
        body: JSON.stringify({ checklistId, sheet, type: 'midden' }),
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Run mislukt (${res.status})`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.length === 0) continue;
          handleEvent(JSON.parse(trimmed));
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Onbekende fout');
    } finally {
      setRunning(false);
    }

    function handleEvent(event: unknown): void {
      if (typeof event !== 'object' || event === null) return;
      const ev = event as Record<string, unknown>;
      if (typeof ev['error'] === 'string') {
        setError(ev['error']);
        return;
      }
      if (typeof ev['total'] === 'number') {
        const total = ev['total'];
        const succeeded = typeof ev['succeeded'] === 'number' ? ev['succeeded'] : 0;
        const failed = typeof ev['failed'] === 'number' ? ev['failed'] : 0;
        setProgress({ done: succeeded + failed, total });
        if (ev['done'] === true) {
          setSummary({ succeeded, failed, total, documentId });
          setStep('results');
          router.refresh();
        }
      }
    }
  }

  function handleStepClick(id: string): void {
    if (running) return;
    if (id === 'upload') setStep('upload');
    if (id === 'process' && hasUploads) setStep('process');
    if (id === 'results' && summary !== null) setStep('results');
  }

  return (
    <>
      <div className="mt-6 flex items-center justify-between border-b border-[var(--border)] pb-3">
        <Stepper steps={steps} onStepClick={handleStepClick} />
      </div>

      <div className="mt-8">
        {step === 'upload' && (
          <UploadStep
            checklists={initialChecklists}
            documents={initialDocuments}
            onUploaded={() => router.refresh()}
            onNext={() => setStep('process')}
            canContinue={hasUploads}
          />
        )}

        {step === 'process' && (
          <ProcessStep
            checklists={initialChecklists}
            documents={initialDocuments}
            selectedChecklist={selectedChecklist}
            selectedDocument={selectedDocument}
            sheet={sheet}
            onChecklistChange={(v) => {
              setChecklistId(v);
              setSheet('');
            }}
            onDocumentChange={setDocumentId}
            onSheetChange={setSheet}
            running={running}
            progress={progress}
            canRun={canRun}
            onStart={handleStart}
            onBack={() => setStep('upload')}
            error={error}
          />
        )}

        {step === 'results' && summary !== null && (
          <ResultsStep
            summary={summary}
            onBack={() => setStep('process')}
            onNewRun={() => {
              setSummary(null);
              setSheet('');
              setStep('process');
            }}
          />
        )}
      </div>
    </>
  );
}

function stateOf(
  id: StepId,
  current: StepId,
  hasUploads: boolean,
  summary: RunSummary | null,
): Step['state'] {
  if (id === current) return 'active';
  if (id === 'upload') return hasUploads ? 'done' : 'todo';
  if (id === 'process') return summary !== null ? 'done' : 'todo';
  if (id === 'results') return summary !== null ? 'todo' : 'todo';
  return 'todo';
}

/* ---------- Upload step ---------- */

function UploadStep({
  checklists,
  documents,
  onUploaded,
  onNext,
  canContinue,
}: {
  checklists: readonly ChecklistOption[];
  documents: readonly DocumentOption[];
  onUploaded: () => void;
  onNext: () => void;
  canContinue: boolean;
}) {
  return (
    <section className="animate-fade-up">
      <h2 className="text-base font-semibold tracking-tight">Upload bestanden</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        We hebben een SRA-checklist en een jaarrekening nodig.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <FileDropZone
          label="SRA-checklist"
          sublabel=".xlsm of .xlsx"
          accept=".xlsm,.xlsx,application/vnd.ms-excel.sheet.macroenabled.12,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          endpoint="/api/checklists"
          existing={checklists.map((c) => ({
            id: c.id,
            filename: c.filename,
            hint: `${c.sheets.length} sheets`,
          }))}
          onUploaded={onUploaded}
        />
        <FileDropZone
          label="Jaarrekening"
          sublabel="PDF, max 20 MB"
          accept="application/pdf"
          endpoint="/api/documents"
          existing={documents.map((d) => ({
            id: d.id,
            filename: d.filename,
            hint: `${d.pageCount} pagina's`,
          }))}
          onUploaded={onUploaded}
        />
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={onNext}
          disabled={!canContinue}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Volgende →
        </button>
      </div>
    </section>
  );
}

/* ---------- Process step ---------- */

function ProcessStep(props: {
  checklists: readonly ChecklistOption[];
  documents: readonly DocumentOption[];
  selectedChecklist: ChecklistOption | null;
  selectedDocument: DocumentOption | null;
  sheet: string;
  onChecklistChange: (v: string) => void;
  onDocumentChange: (v: string) => void;
  onSheetChange: (v: string) => void;
  running: boolean;
  progress: { done: number; total: number } | null;
  canRun: boolean;
  onStart: () => void;
  onBack: () => void;
  error: string | null;
}) {
  const {
    checklists,
    documents,
    selectedChecklist,
    selectedDocument,
    sheet,
    onChecklistChange,
    onDocumentChange,
    onSheetChange,
    running,
    progress,
    canRun,
    onStart,
    onBack,
    error,
  } = props;

  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasMultipleChecklists = checklists.length > 1;
  const hasMultipleDocuments = documents.length > 1;
  const canSwitch = hasMultipleChecklists || hasMultipleDocuments;

  if (running) {
    return <RunningView progress={progress} />;
  }

  return (
    <section className="animate-fade-up">
      <h2 className="text-base font-semibold tracking-tight">Process</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Kies welk onderdeel van de checklist je wilt controleren.
      </p>

      {/* Wat-gebruiken-we-blok */}
      <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm shadow-[0_1px_2px_rgba(28,27,25,0.04)]">
        <ul className="space-y-1">
          <li className="flex items-baseline justify-between gap-2">
            <span className="text-[var(--muted)]">Checklist:</span>
            <span className="truncate font-medium">{selectedChecklist?.name ?? '—'}</span>
          </li>
          <li className="flex items-baseline justify-between gap-2">
            <span className="text-[var(--muted)]">Jaarrekening:</span>
            <span className="truncate font-medium">{selectedDocument?.filename ?? '—'}</span>
          </li>
        </ul>
        {canSwitch && (
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="mt-2 text-xs text-[var(--muted)] underline-offset-4 hover:underline"
          >
            {showAdvanced ? 'Verberg' : 'Wijzig selectie'}
          </button>
        )}
      </div>

      {showAdvanced && canSwitch && (
        <div className="mt-4 space-y-4">
          {hasMultipleChecklists && (
            <SelectField
              label="SRA-checklist"
              value={selectedChecklist?.id ?? ''}
              onChange={onChecklistChange}
              options={checklists.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Selecteer checklist…"
            />
          )}
          {hasMultipleDocuments && (
            <SelectField
              label="Jaarrekening"
              value={selectedDocument?.id ?? ''}
              onChange={onDocumentChange}
              options={documents.map((d) => ({ value: d.id, label: d.filename }))}
              placeholder="Selecteer jaarrekening…"
            />
          )}
        </div>
      )}

      {/* Sheet-selector — de enige actieve keuze */}
      <div className="mt-6">
        <SelectField
          label="Welk onderdeel van de checklist?"
          value={sheet}
          onChange={onSheetChange}
          options={(selectedChecklist?.sheets ?? []).map((s) => ({
            value: s.name,
            label: `${s.name} — ${s.idCount} checks`,
          }))}
          placeholder={
            selectedChecklist === null ? 'Geen checklist geselecteerd' : 'Selecteer onderdeel…'
          }
          disabled={selectedChecklist === null}
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-[var(--muted)] underline-offset-4 hover:underline"
        >
          ← Terug
        </button>
        <button
          type="button"
          onClick={onStart}
          disabled={!canRun}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start analyse
        </button>
      </div>
    </section>
  );
}

function RunningView({ progress }: { progress: { done: number; total: number } | null }) {
  const total = progress?.total ?? 0;
  const done = progress?.done ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <section className="py-6">
      <h2 className="text-base font-semibold tracking-tight">Bezig met evalueren</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Claude beoordeelt elke check tegen de jaarrekening. Even geduld…
      </p>

      <div className="mt-8">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium tabular-nums">
            {done} / {total > 0 ? total : '…'}
          </span>
          <span className="text-[var(--muted)] tabular-nums">{pct}%</span>
        </div>
        <div
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-soft)]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div
            className="h-full bg-[var(--foreground)] transition-all duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Je kunt deze pagina open laten staan — we gaan automatisch door zodra het klaar is.
        </p>
      </div>
    </section>
  );
}

/* ---------- Results step ---------- */

function ResultsStep({
  summary,
  onBack,
  onNewRun,
}: {
  summary: RunSummary;
  onBack: () => void;
  onNewRun: () => void;
}) {
  return (
    <section className="animate-fade-up">
      <h2 className="text-base font-semibold tracking-tight">Klaar</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {summary.succeeded} van {summary.total} checks succesvol geëvalueerd
        {summary.failed > 0 ? ` · ${summary.failed} mislukt` : ''}.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={`/documents/${summary.documentId}`}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)]"
        >
          Bekijk volledige resultaten →
        </a>
        <button
          type="button"
          onClick={onNewRun}
          className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-soft)]"
        >
          Nog een analyse
        </button>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-8 text-sm text-[var(--muted)] underline-offset-4 hover:underline"
      >
        ← Terug
      </button>
    </section>
  );
}

/* ---------- Tiny UI primitives ---------- */

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mt-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm shadow-sm focus:border-[var(--foreground)] focus:outline-none disabled:bg-[var(--surface-soft)] disabled:text-[var(--muted)]"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
