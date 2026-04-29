/**
 * @summary Eén vector-record voor de in-memory ranker.
 */
export interface VectorRecord<TPayload> {
  readonly embedding: number[];
  readonly payload: TPayload;
}
 
/**
 * @summary Eén gerangschikt resultaat met cosine-score.
 */
export interface RankedResult<TPayload> {
  readonly score: number;
  readonly payload: TPayload;
}
 
/**
 * @summary In-memory cosine-similarity store.
 *
 * @remarks
 * Voor een case-project is dit pragmatisch: per document hebben we typisch
 * 100-300 chunks, dat ranken duurt enkele millisecondes. Voor productie zou
 * je dit vervangen door pgvector of een dedicated vector-DB (zie ADR 0002).
 *
 * De class is **stateless en generiek** — payload is van het generic type,
 * dus we kunnen hem hergebruiken voor andere zoek-scenario's.
 *
 * @example
 * ```ts
 * const top = VectorStore.search(queryVec, [
 *   { embedding: vec1, payload: { id: 'a', page: 1 } },
 *   { embedding: vec2, payload: { id: 'b', page: 5 } },
 * ], 5);
 * ```
 */
export class VectorStore {
  /**
   * Zoekt de top-K best-matchende records via cosine similarity.
   *
   * @param query - De query-vector (van bv. een SRA-check).
   * @param records - De index — al je document-chunks van dat document.
   * @param topK - Max aantal te retourneren resultaten.
   * @returns Resultaten gesorteerd op aflopende score.
   */
  public static search<T>(
    query: number[],
    records: readonly VectorRecord<T>[],
    topK: number,
  ): RankedResult<T>[] {
    const scored: RankedResult<T>[] = records.map((r) => ({
      score: VectorStore.cosine(query, r.embedding),
      payload: r.payload,
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }
 
  /**
   * Cosine similarity — gangbare maat voor "hoeveel lijken deze twee
   * vectors qua richting op elkaar". Voyage embeddings zijn al
   * L2-genormaliseerd, maar we delen netjes door de magnitude
   * zodat de class ook werkt met andere providers.
   *
   * @returns Een waarde tussen -1 en 1. Hoe hoger, hoe relevanter.
   */
  public static cosine(a: readonly number[], b: readonly number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vector-mismatch: ${a.length} vs ${b.length}`);
    }
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
      const ai = a[i] ?? 0;
      const bi = b[i] ?? 0;
      dot += ai * bi;
      magA += ai * ai;
      magB += bi * bi;
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }
}
 