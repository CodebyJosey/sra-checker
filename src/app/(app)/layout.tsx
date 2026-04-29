import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/infrastructure/auth/auth';
import AppHeader from '@/components/app-header';
 
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
 
  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <AppHeader userName={session.user.name} userEmail={session.user.email} />
      {children}
    </div>
  );
}
 