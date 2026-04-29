import ExcelJS, { type CellValue } from 'exceljs';
import { ChecklistItem } from '@/domain/checklist/ChecklistItem';
import type { ChecklistRepository } from '../persistence/ChecklistRepository';
 
/**
 * @summary Importeert SRA-checks uit een `.xlsm`-bestand naar de database.
 *
 * @remarks
 * De SRA-checklist is een Excel met per kolom: A=tekst, B=Groot, C=Midden,
 * D=Klein, E=Bron. Cellen B/C/D bevatten markers zoals `a` (altijd), `i+d`
 * (informatie + disclosure), `f` (fiscaal) of `uitz` (uitzondering).
 *
 * Voor de case zijn we **uitsluitend** geïnteresseerd in checks waar
 * minstens één van Groot/Midden/Klein de marker `i+d` heeft. Section-headers
 * zoals "PRESENTATIE" of "ALGEMEEN" hebben marker `a` en vallen daarom
 * automatisch buiten de filter.
 *
 * De class is bewust dom: hij parseert, normaliseert, en delegeert
 * persistence aan een `ChecklistRepository`.
 *
 * @example
 * ```ts
 * const importer = new ChecklistImporter(checklistRepository);
 * const n = await importer.importSheet('data/source/SRA-checklist.xlsm',
 *                                       'Grondslagen en uitgangspunten');
 * console.log(`${n} checks geïmporteerd`);
 * ```
 */
export class ChecklistImporter {
  private static readonly HEADER_ROWS = 5;
  /** Spatie-verwijderde, lowercase representatie van de marker die we zoeken. */
  private static readonly ID_MARKER = 'i+d';
 
  public constructor(private readonly repository: ChecklistRepository) {}
 
  /**
   * Leest één sheet uit het workbook en upsert alle i+d-checks.
   *
   * @param filePath - Absoluut of relatief pad naar het `.xlsm`-bestand.
   * @param sheetName - Naam van het sheet, bv. `"Grondslagen en uitgangspunten"`.
   * @returns Het aantal geïmporteerde checks.
   * @throws Error als het sheet niet bestaat in het workbook.
   */
  public async importSheet(filePath: string, sheetName: string): Promise<number> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
 
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) {
      const available = workbook.worksheets.map((w) => w.name).join(', ');
      throw new Error(
        `Sheet "${sheetName}" niet gevonden in ${filePath}. Beschikbaar: ${available}`,
      );
    }
 
    const items: ChecklistItem[] = [];
    let ordering = 0;
 
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= ChecklistImporter.HEADER_ROWS) return;
 
      const description = this.cellToString(row.getCell(1).value).trim();
      if (description.length < 5) return; // ruis-rijen overslaan
 
      const grootRaw = this.cellToString(row.getCell(2).value);
      const middenRaw = this.cellToString(row.getCell(3).value);
      const kleinRaw = this.cellToString(row.getCell(4).value);
      const sourceRaw = this.cellToString(row.getCell(5).value).trim();
 
      const groot = this.isIdMarker(grootRaw);
      const midden = this.isIdMarker(middenRaw);
      const klein = this.isIdMarker(kleinRaw);
 
      if (!groot && !midden && !klein) return; // geen i+d-row, overslaan
 
      ordering += 10; // stap 10: laat ruimte voor latere inserts
      items.push(
        ChecklistItem.create({
          sheet: sheetName,
          ordering,
          description,
          source: sourceRaw.length > 0 ? sourceRaw : null,
          applicability: { groot, midden, klein },
        }),
      );
    });
 
    return this.repository.upsertMany(items);
  }
 
  /**
   * Markeert een cel-waarde als de SRA-marker `i+d` (case-insensitief, spaties genegeerd).
   *
   * @param raw - Onbewerkte tekst uit de cel.
   */
  private isIdMarker(raw: string): boolean {
    return raw.replace(/\s/g, '').toLowerCase() === ChecklistImporter.ID_MARKER;
  }
 
  /**
   * Normaliseert een ExcelJS cell-value naar een platte string.
   *
   * @remarks
   * ExcelJS retourneert mogelijk: `null`, `undefined`, primitief, `Date`,
   * een rich-text-object met `richText`-array, of een formula-object met
   * een `result`-veld. We pakken alle smaken af.
   *
   * @param value - De ruwe waarde uit `cell.value`.
   * @returns De best mogelijke tekst-representatie. Lege string bij null/undefined.
   */
  private cellToString(value: CellValue): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (value instanceof Date) return value.toISOString();
 
    if (typeof value === 'object') {
      // Rich text
      if ('richText' in value && Array.isArray(value.richText)) {
        return value.richText.map((p) => p.text).join('');
      }
      // Formula with cached result
      if ('result' in value) {
        return this.cellToString(value.result as CellValue);
      }
      // Hyperlink object: { text, hyperlink }
      if ('text' in value) {
        return this.cellToString(value.text as CellValue);
      }
    }
    return '';
  }
}
 