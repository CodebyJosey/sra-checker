import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { ChecklistImporter } from '@/infrastructure/parsing/ChecklistImporter';
import type { ChecklistRepository } from '@/infrastructure/persistence/ChecklistRepository';
 
export interface ImportInput {
  readonly userId: string;
  readonly displayName: string;
  readonly filename: string;
  readonly bytes: Buffer;
}
 
export interface ImportOutput {
  readonly checklistId: string;
  readonly sheetCount: number;
  readonly itemCount: number;
}
 
/**
 * @summary Verwerkt een geüploade SRA-checklist (.xlsm) naar de database.
 *
 * @remarks
 * Stappen:
 * 1. Grootte-check.
 * 2. Bestand parsen — falen we hier al dan komt er niks op disk.
 * 3. Bestand naar disk (`uploads/<userId>/checklists/<id>.xlsm`).
 * 4. Checklist + alle items in één transactie naar DB.
 */
export class ImportChecklistUseCase {
  private static readonly MAX_BYTES = 10 * 1024 * 1024; // 10 MB
 
  public constructor(
    private readonly importer: ChecklistImporter,
    private readonly checklists: ChecklistRepository,
    private readonly uploadsDir: string = path.join(process.cwd(), 'uploads'),
  ) {}
 
  public async execute(input: ImportInput): Promise<ImportOutput> {
    if (input.bytes.length > ImportChecklistUseCase.MAX_BYTES) {
      throw new Error('Checklist is te groot (max 10 MB)');
    }
 
    const parsed = await this.importer.parse(input.bytes);
    if (parsed.totalItems === 0) {
      throw new Error('Geen i+d-checks gevonden in dit bestand');
    }
 
    const userDir = path.join(this.uploadsDir, input.userId, 'checklists');
    await fs.mkdir(userDir, { recursive: true });
    // Unieke filename per upload — checklistId krijgen we pas terug na DB-insert,
    // dus we gebruiken een timestamp om collisions te voorkomen.
    const safeName = `checklist-${Date.now()}.xlsm`;
    const storagePath = path.join(userDir, safeName);
    await fs.writeFile(storagePath, input.bytes);
 
    const items = parsed.sheets.flatMap((s) => s.items);
    const sheetSummaries = parsed.sheets.map((s) => ({
      name: s.name,
      idCount: s.items.length,
    }));
 
    const checklistId = await this.checklists.createWithItems({
      userId: input.userId,
      name: input.displayName,
      filename: input.filename,
      storagePath,
      sheets: sheetSummaries,
      items,
    });
 
    return {
      checklistId,
      sheetCount: parsed.sheets.length,
      itemCount: parsed.totalItems,
    };
  }
}
 