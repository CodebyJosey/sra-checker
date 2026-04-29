/**
 * @summary Mogelijke uitkomsten van een AI-evaluatie van een SRA-check.
 *
 * @remarks
 * - `PASS` — de jaarrekening voldoet aan de check op basis van de fragmenten.
 * - `FAIL` — de jaarrekening voldoet aantoonbaar niet aan de check.
 * - `NOT_APPLICABLE` — de check is niet relevant voor deze jaarrekening
 *   (bijvoorbeeld omdat een bepaalde post niet voorkomt).
 * - `UNCERTAIN` — er is niet genoeg informatie in de fragmenten om met
 *   vertrouwen een oordeel te geven. Dit is bewust een eerste-klas optie:
 *   het voorkomt dat het model gokt en ondersteunt de mens-in-the-loop.
 */
export type CheckStatus = 'PASS' | 'FAIL' | 'NOT_APPLICABLE' | 'UNCERTAIN';

/**
 * @summary Het resultaat van één SRA-check tegen één jaarrekening.
 *
 * @remarks
 * Bevat de uitkomst, de paginareferentie waar het bewijs gevonden is, een
 * letterlijk citaat ter verifieerbaarheid, en de redenering van het AI-model.
 * Dit is een **value object** — geen identiteit los van de combinatie
 * `(documentId, checklistItemId)`.
 */
export class CheckResult {
  private constructor(
    public readonly documentId: string,
    public readonly checklistItemId: string,
    public readonly status: CheckStatus,
    public readonly pageReference: number | null,
    public readonly citation: string | null,
    public readonly reasoning: string,
    public readonly modelUsed: string,
    public readonly evaluatedAt: Date,
  ) {}

  /**
   * Construeert een `CheckResult`. Doet basisvalidatie zodat upstream-bugs
   * niet stilletjes naar de DB sluipen.
   *
   * @param props - De ruwe output van de AI-provider plus context-IDs.
   * @returns Een immutable `CheckResult`.
   * @throws Error als de redenering leeg is of de paginareferentie negatief is.
   */
  public static create(props: {
    documentId: string;
    checklistItemId: string;
    status: CheckStatus;
    pageReference: number | null;
    citation: string | null;
    reasoning: string;
    modelUsed: string;
    evaluatedAt?: Date;
  }): CheckResult {
    if (props.reasoning.trim().length === 0) {
      throw new Error('CheckResult.reasoning mag niet leeg zijn');
    }
    if (props.pageReference !== null && props.pageReference < 1) {
      throw new Error('CheckResult.pageReference moet >= 1 zijn');
    }
    return new CheckResult(
      props.documentId,
      props.checklistItemId,
      props.status,
      props.pageReference,
      props.citation,
      props.reasoning,
      props.modelUsed,
      props.evaluatedAt ?? new Date(),
    );
  }

  /**
   * Of dit resultaat aandacht van een mens vereist (alles behalve een groene PASS).
   */
  public needsHumanReview(): boolean {
    return this.status !== 'PASS';
  }
}
