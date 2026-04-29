'use client';
 
export type StepState = 'done' | 'active' | 'todo';
 
export interface Step {
  readonly id: string;
  readonly label: string;
  readonly state: StepState;
}
 
interface Props {
  readonly steps: readonly Step[];
  readonly onStepClick?: (id: string) => void;
}
 
/**
 * Compacte tabbladen-stepper. Inactieve, niet-klikbare stappen zijn dim.
 */
export default function Stepper({ steps, onStepClick }: Props) {
  return (
    <nav aria-label="Voortgang" className="flex items-center gap-1 text-sm">
      {steps.map((step, index) => {
        const isClickable = onStepClick !== undefined && step.state !== 'todo';
        return (
          <div key={step.id} className="flex items-center">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(step.id)}
              className={
                'rounded-md px-3 py-1.5 text-sm transition ' +
                (step.state === 'active'
                  ? 'bg-[var(--surface-soft)] font-medium text-[var(--foreground)]'
                  : step.state === 'done'
                    ? 'text-[var(--muted)] hover:text-[var(--foreground)]'
                    : 'cursor-not-allowed text-[var(--muted)] opacity-60')
              }
            >
              <span className="mr-1.5 text-xs tabular-nums">{index + 1}</span>
              {step.label}
            </button>
            {index < steps.length - 1 && (
              <span className="px-1 text-[var(--muted)]" aria-hidden>
                /
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
 