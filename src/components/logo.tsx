/**
 * @summary Klein logo voor sra-checker — een document met een vinkje.
 */
export default function Logo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-6 w-6 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      <path d="M8 8h8M8 12h5" className="opacity-50" />
      <path d="M9.5 16.5l2 2 4-4" className="text-emerald-500" stroke="currentColor" />
    </svg>
  );
}
 