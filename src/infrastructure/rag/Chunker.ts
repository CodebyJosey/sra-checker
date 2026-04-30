import type { ExtractedPage } from '@/infrastructure/parsing/PdfExtractor';

/**
 * @summary Eén stuk geëxtraheerde tekst, klaar om te embedden.
 */
export interface RawChunk {
  /** 1-based paginanummer waar dit chunk uit komt. */
  readonly page: number;
  /** Volgorde-index binnen het document, voor stabiele referentie. */
  readonly position: number;
  readonly content: string;
}

/**
 * @summary Splitst per-pagina-tekst in overlappende chunks.
 *
 * @remarks
 * Strategie: per pagina een sliding window van ~1500 tekens (≈ 400 tokens)
 * met 200 tekens overlap. Pagina-grenzen worden gerespecteerd zodat we
 * altijd weten op welke pagina een chunk staat — essentieel voor de
 * paginareferentie in de check-output.
 *
 * @example
 * ```ts
 * const chunks = new Chunker().chunk(extractedPages);
 * console.log(`${chunks.length} chunks vanuit ${extractedPages.length} pagina's`);
 * ```
 */
export class Chunker {
  public static readonly DEFAULT_MAX_CHARS = 1500;
  public static readonly DEFAULT_OVERLAP = 200;

  public constructor(
    private readonly maxChars: number = Chunker.DEFAULT_MAX_CHARS,
    private readonly overlap: number = Chunker.DEFAULT_OVERLAP,
  ) {
    if (overlap >= maxChars) {
      throw new Error('Chunker: overlap moet kleiner zijn dan maxChars');
    }
  }

  /**
   * Splitst een lijst pagina's in chunks.
   *
   * @param pages - Pagina's zoals geleverd door {@link PdfExtractor}.
   * @returns Een platte lijst chunks. Lege pagina's worden overgeslagen.
   */
  public chunk(pages: readonly ExtractedPage[]): RawChunk[] {
    const result: RawChunk[] = [];
    let position = 0;
    for (const page of pages) {
      const text = page.text.trim();
      if (text.length === 0) continue;
      for (const piece of this.splitText(text)) {
        result.push({ page: page.page, position, content: piece });
        position += 1;
      }
    }
    return result;
  }

  /**
   * Sliding-window splitser met overlap.
   * @param text - Volledige tekst van één pagina.
   */
  private splitText(text: string): string[] {
    if (text.length <= this.maxChars) return [text];
    const out: string[] = [];
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + this.maxChars, text.length);
      out.push(text.slice(start, end).trim());
      if (end === text.length) break;
      start = end - this.overlap;
    }
    return out.filter((s) => s.length > 0);
  }
}
