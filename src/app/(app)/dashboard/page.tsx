import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/infrastructure/auth/auth';
import { prisma } from '@/infrastructure/persistence/prisma';
import { DocumentRepository } from '@/infrastructure/persistence/DocumentRepository';
import { CheckResultRepository } from '@/infrastructure/persistence/CheckResultRepository';
import UploadForm from '@/components/upload-form';
import RunChecksButton from '@/components/run-checks-button';
import Link from 'next/link';
 
export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
 
  const documentRepo = new DocumentRepository(prisma);
  const resultRepo = new CheckResultRepository(prisma);
  const documents = await documentRepo.findByUser(session.user.id);
  const counts = await Promise.all(documents.map((d) => resultRepo.statusCounts(d.id)));
 
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
            {documents.map((doc, i) => {
              const c = counts[i] ?? { PASS: 0, FAIL: 0, NOT_APPLICABLE: 0, UNCERTAIN: 0 };
              const total = c.PASS + c.FAIL + c.NOT_APPLICABLE + c.UNCERTAIN;
              return (
                <li key={doc.id} className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="min-w-0 flex-1 group"
                    >
                      <p className="truncate text-sm font-medium group-hover:underline">
                        {doc.filename}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        {doc.pageCount} pagina&apos;s ·{' '}
                        {new Date(doc.createdAt).toLocaleString('nl-NL', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </Link>
                    {total > 0 && (
                      <span className="shrink-0 text-xs text-[var(--muted)]">
                        {c.PASS + c.FAIL + c.NOT_APPLICABLE + c.UNCERTAIN} / {c.PASS + c.FAIL + c.NOT_APPLICABLE + c.UNCERTAIN}
                      </span>
                    )}
                  </div>
                  {total > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">
                        {c.PASS} pass
                      </span>
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">
                        {c.FAIL} fail
                      </span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                        {c.UNCERTAIN} onzeker
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                        {c.NOT_APPLICABLE} n.v.t.
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
 