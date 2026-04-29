/**
 * @summary Seed-script — leest de SRA-Excel en vult `ChecklistItem` in de DB.
 *
 * @remarks
 * Aan te roepen via `npm run db:seed`. Idempotent dankzij `upsertMany`.
 * Begint bewust met één sheet ("Grondslagen en uitgangspunten") zoals
 * de case voorschrijft. Uitbreiden naar alle sheets is een lus toevoegen.
 */
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { ChecklistImporter } from '../src/infrastructure/parsing/ChecklistImporter';
import { ChecklistRepository } from '../src/infrastructure/persistence/ChecklistRepository';
 
const SHEETS_TO_IMPORT = [
  'Grondslagen en uitgangspunten',
  // 'Materiële vaste activa',
  // 'Eigen vermogen',
  // ... uitbreiden zodra de pipeline staat
] as const;
 
async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const repository = new ChecklistRepository(prisma);
    const importer = new ChecklistImporter(repository);
 
    const xlsxPath = path.join(process.cwd(), 'data', 'source', 'SRA-checklist.xlsm');
    console.log(`📥 Lezen van ${xlsxPath}\n`);
 
    let total = 0;
    for (const sheet of SHEETS_TO_IMPORT) {
      const n = await importer.importSheet(xlsxPath, sheet);
      console.log(`  ✓ ${sheet}: ${n} checks`);
      total += n;
    }
 
    console.log(`\n🌱 Klaar — ${total} i+d-checks in DB.`);
    const counts = await repository.countBySheet();
    console.table(counts);
  } finally {
    await prisma.$disconnect();
  }
}
 
main().catch((err: unknown) => {
  console.error('❌ Seed mislukt:', err);
  process.exit(1);
});
 