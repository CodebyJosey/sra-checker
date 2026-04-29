'use client';
 
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from '@/infrastructure/auth/auth-client';
 
interface AppHeaderProps {
  readonly userName?: string;
  readonly userEmail?: string;
}
 
export default function AppHeader({ userName, userEmail }: AppHeaderProps) {
  const router = useRouter();
 
  return (
    <header className="border-b border-[var(--border)]">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
          sra-checker
        </Link>
        {userName && (
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-[var(--muted)] sm:inline">{userEmail}</span>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.push('/login');
                router.refresh();
              }}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--surface-soft)]"
            >
              Uitloggen
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
 