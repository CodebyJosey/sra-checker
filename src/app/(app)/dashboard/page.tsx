import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/infrastructure/auth/auth';
import { prisma } from '@/infrastructure/persistence/prisma';
import { DocumentRepository } from '@/infrastructure/persistence/DocumentRepository';
import UploadForm from '@/components/upload-form';
 
export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
 
  const documents = await new DocumentRepository(prisma).findByUser(session.user.id);
 
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Jaarrekeningen</h1>
        <p className="text-sm text-[var(--muted)]">
          Upload een PDF en laat de SRA-checks automatisch evalueren.
        </p>
      </div>
 
      <section className="mt-8">
        <UploadForm />
      </section>
 
      <section className="mt-12">
        <h2 className="text-sm font-medium text-[var(--muted)]">Eerder geüpload</h2>
        {documents.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">
            Nog geen documenten. Upload je eerste jaarrekening hierboven.
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.filename}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {doc.pageCount} pagina&apos;s ·{' '}
                    {new Date(doc.createdAt).toLocaleString('nl-NL', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[var(--surface-soft)] px-2.5 py-0.5 text-xs text-[var(--muted)]">
                  Wachten op evaluatie
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}