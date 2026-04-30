import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/infrastructure/auth/auth';
import Logo from '@/components/logo';
 
export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect('/dashboard');
 
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header />
 
      <main className="mx-auto max-w-6xl px-6">
        {/* Hero */}
        <section className="grid items-center gap-10 pt-16 pb-20 sm:pt-24 lg:grid-cols-2 lg:gap-16">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--muted)] shadow-[var(--shadow-sm)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
              SRA-controle, automatisch
            </span>
 
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Jaarrekeningen toetsen aan de SRA-checklist —{' '}
              <span className="text-[var(--brand)]">in minuten, niet uren.</span>
            </h1>
 
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
              Upload je SRA-checklist en een jaarrekening. AI loopt elke check langs
              en geeft per regel een onderbouwd oordeel met{' '}
              <span className="font-medium text-[var(--foreground)]">paginareferentie</span>{' '}
              en{' '}
              <span className="font-medium text-[var(--foreground)]">letterlijk citaat</span>.
            </p>
 
            <div className="mt-8 flex flex-wrap items-center gap-3 animate-fade-up-delayed">
              <Link href="/register" className="btn-primary">
                Gratis aan de slag
                <ArrowRightIcon />
              </Link>
              <Link href="/login" className="btn-secondary">
                Inloggen
              </Link>
            </div>
 
            <p className="mt-6 flex items-center gap-2 text-xs text-[var(--muted)]">
              <CheckCircleIcon className="h-3.5 w-3.5 text-[var(--success)]" />
              Privacy-vriendelijk · documenten verlaten je sessie alleen voor de AI-check
            </p>
          </div>
 
          {/* Product-mockup rechts */}
          <div className="animate-fade-up-delayed">
            <ProductMockup />
          </div>
        </section>
 
        {/* How it works */}
        <section className="border-t border-[var(--border)] py-20">
          <p className="text-sm font-medium text-[var(--brand)]">Workflow</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Drie stappen, geen leercurve.
          </h2>
 
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <Step
              number={1}
              title="Upload"
              body="Sleep je SRA-checklist (.xlsm) en jaarrekening (.pdf) erin. Beide blijven van jou."
            />
            <Step
              number={2}
              title="Process"
              body="Kies welk onderdeel van de checklist je wilt controleren. De AI doet de rest."
            />
            <Step
              number={3}
              title="Resultaten"
              body="Per check een oordeel — voldaan, niet voldaan, of niet van toepassing — met citaat en paginareferentie."
            />
          </div>
        </section>
 
        {/* Features */}
        <section className="border-t border-[var(--border)] py-20">
          <p className="text-sm font-medium text-[var(--brand)]">Wat het doet</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Verifieerbaar AI, geen black box.
          </h2>
 
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <Feature
              title="Paginareferenties die kloppen"
              body="Elke beslissing verwijst naar de pagina waar het bewijs staat — klikbaar te verifiëren."
              icon={<TargetIcon />}
            />
            <Feature
              title="Citaat als bewijslast"
              body="Geen black-box-oordeel. Je ziet altijd het letterlijke fragment dat het oordeel onderbouwt."
              icon={<QuoteIcon />}
            />
            <Feature
              title="Onderbouwing in het Nederlands"
              body="Claude legt in 1-3 zinnen uit waarom de check voldoet of niet."
              icon={<MessageIcon />}
            />
            <Feature
              title="Slim filteren"
              body="Filter op status om te zien waar nog menselijk oordeel nodig is."
              icon={<FilterIcon />}
            />
          </div>
        </section>
 
        <footer className="border-t border-[var(--border)] py-10 text-center text-xs text-[var(--muted)]">
          sra-checker · case-opdracht Bonsai Software · 2026
        </footer>
      </main>
    </div>
  );
}
 
/* ─── Header ─── */
 
function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="text-sm font-semibold tracking-tight">sra-checker</span>
        </div>
        <Link
          href="/login"
          className="text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          Inloggen →
        </Link>
      </div>
    </header>
  );
}
 
/* ─── Product mockup ─── */
 
function ProductMockup() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-md)]">
      {/* Faux browser bar */}
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] pb-3">
        <div className="h-2.5 w-2.5 rounded-full bg-red-300/70" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-300/70" />
      </div>
 
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">voorbeeld-jaarrekening.pdf</span>
          <span className="text-[var(--muted)]">62 pagina&apos;s</span>
        </div>
 
        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-px overflow-hidden rounded-md bg-[var(--border)]">
          <Stat value="34" label="Voldaan" tone="success" />
          <Stat value="3" label="Niet" tone="danger" />
          <Stat value="1" label="Onzeker" tone="warning" />
          <Stat value="1" label="N.v.t." tone="neutral" />
        </div>
 
        {/* Mock check rows */}
        <div className="space-y-1.5 pt-2">
          <MockRow status="success" page={8} text="Grondslagen van waardering opgenomen" />
          <MockRow status="success" page={9} text="Toelichting bij actuele waarde" />
          <MockRow status="warning" page={null} text="Schattingen en onzekerheden" />
          <MockRow status="success" page={12} text="Consolidatiegrondslagen" />
        </div>
      </div>
    </div>
  );
}
 
function Stat({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: 'success' | 'danger' | 'warning' | 'neutral';
}) {
  const colors = {
    success: 'text-[var(--success)]',
    danger: 'text-[var(--danger)]',
    warning: 'text-[var(--warning)]',
    neutral: 'text-[var(--muted)]',
  };
  return (
    <div className="bg-[var(--surface)] px-2 py-2 text-center">
      <p className={`text-base font-semibold tabular-nums ${colors[tone]}`}>{value}</p>
      <p className="text-[10px] text-[var(--muted)]">{label}</p>
    </div>
  );
}
 
function MockRow({
  status,
  page,
  text,
}: {
  status: 'success' | 'warning';
  page: number | null;
  text: string;
}) {
  const dot =
    status === 'success'
      ? 'bg-[var(--success)]'
      : 'bg-[var(--warning)]';
  return (
    <div className="flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1.5 text-[11px]">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="flex-1 truncate">{text}</span>
      {page !== null && <span className="text-[var(--muted)]">p.{page}</span>}
    </div>
  );
}
 
/* ─── Steps & Features ─── */
 
function Step({ number, title, body }: { number: number; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-soft)] text-sm font-semibold text-[var(--brand)]">
        {number}
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
    </div>
  );
}
 
function Feature({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--border-strong)]">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--brand-soft)] text-[var(--brand)]">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
    </div>
  );
}
 
/* ─── Icons ─── */
 
function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M10.3 4.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4L13.6 11H4a1 1 0 1 1 0-2h9.6l-3.3-3.3a1 1 0 0 1 0-1.4z"
        clipRule="evenodd"
      />
    </svg>
  );
}
 
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.7-10.3-4.5 4.5a1 1 0 0 1-1.4 0L6 10.4a1 1 0 0 1 1.4-1.4l1.5 1.5 3.8-3.8a1 1 0 0 1 1.4 1.4z"
        clipRule="evenodd"
      />
    </svg>
  );
}
 
function TargetIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}
 
function QuoteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M7 7h4v4l-2 6H6l1-6H7V7zm8 0h4v4l-2 6h-3l1-6h-1V7z" />
    </svg>
  );
}
 
function MessageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
 
function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}
 