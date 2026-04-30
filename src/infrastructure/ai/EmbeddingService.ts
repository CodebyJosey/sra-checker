/**
 * @summary Wrapper rond Cohere's REST embed-endpoint.
 *
 * @remarks
 * Cohere is gekozen als embedding-provider omdat:
 * - hun gratis trial-tier *geen* creditcard vereist (in tegenstelling tot Voyage),
 * - `embed-multilingual-v3.0` Nederlands goed begrijpt en 1024-dim vectoren
 *   levert (zelfde dimensionaliteit als voyage-3, dus geen DB-migratie nodig),
 * - de REST-API is minimaal — we hebben geen SDK-dependency met fragiele
 *   ESM-imports.
 *
 * De class is een drop-in vervanging van de eerdere Voyage-implementatie:
 * dezelfde public API (`embedDocuments`, `embedQuery`) zodat `Chunker`,
 * `IngestDocumentUseCase` en `DocumentRetriever` ongewijzigd blijven.
 *
 * Cohere staat 96 inputs per call toe — we splitsen automatisch in batches.
 *
 * @example
 * ```ts
 * const svc = new EmbeddingService();
 * const vectors = await svc.embedDocuments(['stuk tekst', 'nog een stuk']);
 * const queryVec = await svc.embedQuery('Zijn de grondslagen toegelicht?');
 * ```
 */
interface CohereEmbedResponse {
  readonly embeddings: { readonly float?: readonly (readonly number[])[] };
}

export class EmbeddingService {
  private static readonly BATCH_SIZE = 96;
  private static readonly DEFAULT_MODEL = 'embed-multilingual-v3.0';
  private static readonly API_URL = 'https://api.cohere.com/v2/embed';

  public constructor(
    private readonly apiKey: string = process.env['COHERE_API_KEY'] ?? '',
    private readonly model: string = EmbeddingService.DEFAULT_MODEL,
  ) {
    if (!apiKey) throw new Error('COHERE_API_KEY ontbreekt in .env.local');
  }

  /**
   * Embed grote stukken context (chunks uit een document).
   *
   * @param texts - De input-strings.
   * @returns Vectors in dezelfde volgorde als de input.
   */
  public async embedDocuments(texts: readonly string[]): Promise<number[][]> {
    return this.embedBatched([...texts], 'search_document');
  }

  /**
   * Embed één korte query (SRA-check) tegen `input_type: 'search_query'`.
   */
  public async embedQuery(text: string): Promise<number[]> {
    const [vec] = await this.embedBatched([text], 'search_query');
    if (!vec) throw new Error('Cohere gaf geen embedding terug');
    return vec;
  }

  /**
   * Splitst de input in batches en concat het resultaat.
   */
  private async embedBatched(
    texts: string[],
    inputType: 'search_document' | 'search_query',
  ): Promise<number[][]> {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += EmbeddingService.BATCH_SIZE) {
      const batch = texts.slice(i, i + EmbeddingService.BATCH_SIZE);
      const res = await fetch(EmbeddingService.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          texts: batch,
          input_type: inputType,
          embedding_types: ['float'],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Cohere API error ${res.status}: ${text}`);
      }

      const json = (await res.json()) as CohereEmbedResponse;
      const vectors = json.embeddings.float;
      if (!vectors || vectors.length !== batch.length) {
        throw new Error('Cohere gaf onvolledige embeddings terug');
      }
      for (const vec of vectors) {
        out.push([...vec]);
      }
    }
    return out;
  }
}
