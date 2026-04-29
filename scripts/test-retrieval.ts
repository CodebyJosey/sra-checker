/**
 * Ad-hoc smoke test voor Stap 7. Pakt het laatste geüploade document en
 * laat zien welke fragmenten relevant zijn voor een paar voorbeeldvragen.
 *
 * Run: `npm.cmd run db:retrieval-test`
 */
import { PrismaClient } from '@prisma/client';
import { EmbeddingService } from '../src/infrastructure/ai/EmbeddingService';
import { DocumentRetriever } from '../src/infrastructure/rag/DocumentRetriever';
 
async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const doc = await prisma.document.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!doc) {
      console.error('Geen documenten in DB. Upload eerst een PDF via de UI.');
      process.exit(1);
    }
 
    const retriever = new DocumentRetriever(prisma, new EmbeddingService());
 
    const queries = [
      'Zijn de grondslagen van waardering van activa en passiva opgenomen in de toelichting?',
      'Welke schattingen of onzekerheden worden genoemd?',
      'Worden de consolidatiegrondslagen uiteengezet?',
    ];
 
    for (const q of queries) {
      console.log(`\n🔍 ${q}\n`);
      const results = await retriever.retrieve(doc.id, q, 3);
      for (const r of results) {
        const preview = r.content.replace(/\s+/g, ' ').slice(0, 180);
        console.log(`  [p.${r.page}] score ${r.score.toFixed(3)} — ${preview}…`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}
 
main().catch((err: unknown) => {
  console.error('❌', err);
  process.exit(1);
});
 