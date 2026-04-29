import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/infrastructure/auth/auth';
import { prisma } from '@/infrastructure/persistence/prisma';
import { ChecklistRepository } from '@/infrastructure/persistence/ChecklistRepository';
import { DocumentRepository } from '@/infrastructure/persistence/DocumentRepository';
import WizardClient from '@/components/wizard-client';
 
export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
 
  const [checklists, documents] = await Promise.all([
    new ChecklistRepository(prisma as any).listByUser(session.user.id),
    new DocumentRepository(prisma as any).findByUser(session.user.id),
  ]);
 
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">SRA-checker</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Upload een SRA-checklist en een jaarrekening, kies een sheet, en laat AI de checks beoordelen.
      </p>
 
      <WizardClient
        initialChecklists={checklists.map((c) => ({
          id: c.id,
          name: c.name,
          filename: c.filename,
          sheets: c.sheets.map((s) => ({ name: s.name, idCount: s.idCount })),
        }))}
        initialDocuments={documents.map((d) => ({
          id: d.id,
          filename: d.filename,
          pageCount: d.pageCount,
        }))}
      />
    </main>
  );
}
 