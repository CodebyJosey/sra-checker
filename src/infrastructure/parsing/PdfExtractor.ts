import { extractText } from 'unpdf';

/**
 * @summary Eén pagina aan platte tekst uit een PDF.
 */
export interface ExtractedPage {
  /** 1-based paginanummer zoals in het document staat. */
  readonly page: number;
  /** Platte tekst van die pagina. Kan leeg zijn (bv. afbeelding-pagina). */
  readonly text: string;
}

/**
 * @summary Resultaat van PDF-extractie.
 */
export interface ExtractedDocument {
  readonly pageCount: number;
  readonly pages: readonly ExtractedPage[];
}

/**
 * @summary Haalt platte tekst per pagina uit een PDF-bestand.
 *
 * @remarks
 * Pagina-isolatie is voor deze case essentieel: de SRA-evaluatie moet
 * straks kunnen zeggen *"voldaan, zie pagina 12"*. Door tekst per pagina
 * te bewaren ipv één blob, krijgen we die paginareferentie gratis.
 *
 * @example
 * ```ts
 * const extractor = new PdfExtractor();
 * const { pageCount, pages } = await extractor.extract(buffer);
 * console.log(`${pageCount} pagina's, eerste pagina: ${pages[0]?.text}`);
 * ```
 */
export class PdfExtractor {
  /**
   * Leest de PDF en geeft één `ExtractedPage` per pagina terug.
   *
   * @param buffer - Ruwe bytes van het PDF-bestand (uit FormData of fs).
   * @returns Het aantal pagina's plus per-pagina tekst.
   * @throws Error als de PDF niet leesbaar is (corrupt, encrypted zonder key, etc.).
   */
  public async extract(buffer: Buffer | Uint8Array): Promise<ExtractedDocument> {
    const bytes = buffer instanceof Buffer ? new Uint8Array(buffer) : buffer;

    // mergePages: false -> result.text wordt een string[] met één entry per pagina.
    const result = await extractText(bytes, { mergePages: false });

    if (!Array.isArray(result.text)) {
      throw new Error('Onverwacht extractText-resultaat: text is geen array');
    }

    const pages: ExtractedPage[] = result.text.map((text, index) => ({
      page: index + 1,
      text: this.normalize(text),
    }));

    return {
      pageCount: result.totalPages ?? pages.length,
      pages,
    };
  }

  /**
   * Normaliseert wittruimte: ligature/regelafbreek-fixes en triple-spaces inkorten.
   */
  private normalize(raw: string): string {
    return raw
      .replace(/­\n?/g, '') // soft hyphen + linebreak
      .replace(/-\n(?=\S)/g, '') // afgebroken woorden weer aan elkaar
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }
}
