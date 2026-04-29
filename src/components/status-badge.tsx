import type { CheckStatus } from '@/domain/checklist/CheckResult';
 
const STYLES: Record<CheckStatus, { label: string; className: string }> = {
  PASS: { label: 'Voldaan', className: 'bg-green-100 text-green-800 ring-green-200' },
  FAIL: { label: 'Niet voldaan', className: 'bg-red-100 text-red-800 ring-red-200' },
  UNCERTAIN: { label: 'Onzeker', className: 'bg-amber-100 text-amber-800 ring-amber-200' },
  NOT_APPLICABLE: { label: 'N.v.t.', className: 'bg-gray-100 text-gray-700 ring-gray-200' },
};
 
interface Props {
  readonly status: CheckStatus;
  readonly className?: string;
}
 
export default function StatusBadge({ status, className = '' }: Props) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.className} ${className}`}
    >
      {s.label}
    </span>
  );
}
 