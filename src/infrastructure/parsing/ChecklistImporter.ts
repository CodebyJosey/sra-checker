import ExcelJS, { type CellValue } from 'exceljs';
import { ChecklistItem } from '@/domain/checklist/ChecklistItem';

/**
 * @summary Resultaat van het inlezen van één checklist-sheet.
 */
export interface ParsedSheet {
  readonly name: string;
  readonly items: readonly ChecklistItem[];
}

/**
 * @summary Resultaat van het inlezen van een hele checklist.
 */
export interface ParsedChecklist {
  readonly sheets: readonly ParsedSheet[];
  /** Totaal aantal i+d-checks over alle sheets. */
  readonly totalItems: number;
}

/**
 * @summary Parser voor SRA-checklist .xlsm-bestanden.
 *
 * @remarks
 * In tegenstelling tot de eerste versie leest deze importer ALLE sheets
 * en filtert per rij op de marker `i+d` (informatie + disclosure) in
 * kolom B/C/D (Groot/Midden/Klein). Section-header-rijen ('a', 'f', etc.)
 * vallen automatisch buiten de filter.
 *
 * De importer is puur — hij leest en parseert. Persistence gebeurt in
 * {@link ImportChecklistUseCase}.
 *
 * @example
 * ```ts
 * const importer = new ChecklistImporter();
 * const result = await importer.parse(buffer);
 * for (const sheet of result.sheets) {
 *   console.log(`${sheet.name}: ${sheet.items.length} i+d-checks`);
 * }
 * ```
 */
export class ChecklistImporter {
  private static readonly HEADER_ROWS = 5;
  private static readonly ID_MARKER = 'i+d';

  /**
   * Leest een hele workbook en geeft per sheet de gevonden i+d-checks terug.
   * Sheets zonder enkele i+d-row worden weggelaten.
   *
   * @param buffer - Ruwe bytes van het .xlsm bestand.
   */
  public async parse(buffer: Buffer | Uint8Array): Promise<ParsedChecklist> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer instanceof Buffer ? buffer.buffer : buffer);

    const sheets: ParsedSheet[] = [];
    let total = 0;

    for (const ws of workbook.worksheets) {
      const items = this.parseSheet(ws);
      if (items.length === 0) continue;
      sheets.push({ name: ws.name, items });
      total += items.length;
    }

    return { sheets, totalItems: total };
  }

  private parseSheet(sheet: ExcelJS.Worksheet): ChecklistItem[] {
    const items: ChecklistItem[] = [];
    let ordering = 0;

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= ChecklistImporter.HEADER_ROWS) return;

      const description = this.cellToString(row.getCell(1).value).trim();
      if (description.length < 5) return;

      const groot = this.isIdMarker(this.cellToString(row.getCell(2).value));
      const midden = this.isIdMarker(this.cellToString(row.getCell(3).value));
      const klein = this.isIdMarker(this.cellToString(row.getCell(4).value));

      if (!groot && !midden && !klein) return;

      const sourceRaw = this.cellToString(row.getCell(5).value).trim();

      ordering += 10;
      items.push(
        ChecklistItem.create({
          sheet: sheet.name,
          ordering,
          description,
          source: sourceRaw.length > 0 ? sourceRaw : null,
          applicability: { groot, midden, klein },
        }),
      );
    });

    return items;
  }

  private isIdMarker(raw: string): boolean {
    return raw.replace(/\s/g, '').toLowerCase() === ChecklistImporter.ID_MARKER;
  }

  private cellToString(value: CellValue): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') {
      if ('richText' in value && Array.isArray(value.richText)) {
        return value.richText.map((p) => p.text).join('');
      }
      if ('result' in value) {
        return this.cellToString(value.result as CellValue);
      }
      if ('text' in value) {
        return this.cellToString(value.text as CellValue);
      }
    }
    return '';
  }
}
