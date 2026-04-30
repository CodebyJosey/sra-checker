import type { CheckStatus } from '@/domain/checklist/CheckResult';
 
const STYLES: Record<CheckStatus, { label: string; className: string }> = {
  PASS: {
    label: 'Voldaan',
    className:
      'bg-[var(--success-bg)] text-[var(--success)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--success)_25%,transparent)]',
  },
  FAIL: {
    label: 'Niet voldaan',
    className:
      'bg-[var(--danger-bg)] text-[var(--danger)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--danger)_20%,transparent)]',
  },
  UNCERTAIN: {
    label: 'Onzeker',
    className:
      'bg-[var(--warning-bg)] text-[var(--warning)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--warning)_20%,transparent)]',
  },
  NOT_APPLICABLE: {
    label: 'N.v.t.',
    className:
      'bg-[var(--neutral-bg)] text-[var(--muted)] ring-1 ring-inset ring-[var(--border)]',
  },
};
 
interface Props {
  readonly status: CheckStatus;
  readonly className?: string;
}
 
export default function StatusBadge({ status, className = '' }: Props) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.className} ${className}`}
    >
      {s.label}
    </span>
  );
}
 