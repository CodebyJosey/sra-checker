import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/infrastructure/auth/auth';
import Logo from '@/components/logo';
 
export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect('/dashboard');
 
  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <Header />
 
      <main className="mx-auto max-w-4xl px-6">
        {/* Hero */}
        <section className="pt-20 pb-16 sm:pt-28">
          <p className="text-sm font-medium text-[var(--muted)]">SRA-controle, automatisch</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Jaarrekeningen toetsen aan de SRA-checklist —{' '}
            <span className="text-[var(--muted)]">in minuten, niet uren.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-[var(--muted)] sm:text-lg">
            Upload je SRA-checklist en een jaarrekening. Onze AI loopt elke check langs,
            geeft per regel een onderbouwd oordeel met paginareferentie, en schaalt mee
            met de drukte van je samenstelafdeling.
          </p>
 
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent-foreground)] transition hover:opacity-90"
            >
              Gratis aan de slag →
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-[var(--border)] px-5 py-2.5 text-sm font-medium hover:bg-[var(--surface-soft)]"
            >
              Inloggen
            </Link>
          </div>
 
          <p className="mt-6 flex items-center gap-2 text-xs text-[var(--muted)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Privacy-vriendelijk · je documenten verlaten je sessie alleen voor de AI-check.
          </p>
        </section>
 
        {/* How it works */}
        <section className="border-t border-[var(--border)] py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Hoe het werkt</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <Step
              number={1}
              title="Upload"
              body="Sleep je SRA-checklist (.xlsm) en de jaarrekening (.pdf) erin. Beide blijven van jou."
            />
            <Step
              number={2}
              title="Process"
              body="Kies welk onderdeel van de checklist je wilt controleren. De AI doet de rest."
            />
            <Step
              number={3}
              title="Resultaten"
              body="Per check een oordeel: voldaan, niet voldaan, of niet van toepassing — met citaat en paginareferentie."
            />
          </div>
        </section>
 
        {/* Features */}
        <section className="border-t border-[var(--border)] py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Wat het doet</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Feature
              title="Paginareferenties die kloppen"
              body="Elke beslissing verwijst naar de pagina waar het bewijs staat. Klikbaar te verifiëren."
            />
            <Feature
              title="Citaat als bewijslast"
              body="Geen black-box-oordeel — je ziet altijd het letterlijke fragment dat het oordeel onderbouwt."
            />
            <Feature
              title="Onderbouwing in het Nederlands"
              body="Claude legt in 1-3 zinnen uit waarom de check voldoet of niet."
            />
            <Feature
              title="i+d filter"
              body="We tonen alleen checks die als 'informatie + disclosure' gelden voor het type onderneming."
            />
          </div>
        </section>
 
        <footer className="border-t border-[var(--border)] py-8 text-center text-xs text-[var(--muted)]">
          sra-checker · case-opdracht Bonsai Software
        </footer>
      </main>
    </div>
  );
}
 
function Header() {
  return (
    <header className="border-b border-[var(--border)]">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="text-sm font-semibold tracking-tight">sra-checker</span>
        </div>
        <Link
          href="/login"
          className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Inloggen
        </Link>
      </div>
    </header>
  );
}
 
function Step({ number, title, body }: { number: number; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:shadow-sm">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--foreground)] text-xs font-medium text-[var(--background)]">
        {number}
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">{body}</p>
    </div>
  );
}
 
function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">{body}</p>
    </div>
  );
}