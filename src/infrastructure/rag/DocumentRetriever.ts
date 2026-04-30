import type { PrismaClient } from '@prisma/client';
import type { EmbeddingService } from '@/infrastructure/ai/EmbeddingService';
import { VectorStore } from '@/infrastructure/rag/VectorStore';

/**
 * @summary Eén relevant fragment voor een check, met paginareferentie en score.
 */
export interface RetrievedFragment {
  readonly chunkId: string;
  readonly page: number;
  readonly content: string;
  readonly score: number;
}

/**
 * @summary Hoog-niveau API: "geef me de top-K relevante fragmenten van dit document voor deze query".
 *
 * @remarks
 * Combineert {@link EmbeddingService} (voor query-embedding) met de DB
 * (chunks ophalen) en {@link VectorStore} (rangschikken). Dit is de class
 * waar de check-evaluator straks tegenaan praat.
 *
 * @example
 * ```ts
 * const retriever = new DocumentRetriever(prisma, embeddings);
 * const top = await retriever.retrieve(documentId, 'Zijn de grondslagen van waardering opgenomen?', 5);
 * ```
 */
export class DocumentRetriever {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly embeddings: EmbeddingService,
  ) {}

  /**
   * Embedt de query, haalt alle chunks van het document op, en geeft de top-K terug.
   *
   * @param documentId - Het document waar binnen we zoeken.
   * @param query - Vrije-vorm vraag of check-tekst.
   * @param topK - Aantal fragmenten om terug te geven (default 5).
   */
  public async retrieve(documentId: string, query: string, topK = 5): Promise<RetrievedFragment[]> {
    const queryVec = await this.embeddings.embedQuery(query);

    const rows = await this.prisma.documentChunk.findMany({
      where: { documentId, NOT: { embedding: '' } },
      select: { id: true, page: true, content: true, embedding: true },
    });

    const records = rows
      .map((r) => {
        if (!r.embedding) return null;
        const vec = JSON.parse(r.embedding) as number[];
        return {
          embedding: vec,
          payload: { chunkId: r.id, page: r.page, content: r.content },
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const ranked = VectorStore.search(queryVec, records, topK);
    return ranked.map((r) => ({
      chunkId: r.payload.chunkId,
      page: r.payload.page,
      content: r.payload.content,
      score: r.score,
    }));
  }
}
