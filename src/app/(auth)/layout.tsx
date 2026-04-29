import Logo from '@/components/logo';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--surface-soft)]">
      <header className="px-6 pt-8">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Logo />
          sra-checker
        </Link>
      </header>
      <main className="mx-auto flex max-w-md flex-col px-6 pt-16 pb-12">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
          {children}
        </div>
      </main>
    </div>
  );
}