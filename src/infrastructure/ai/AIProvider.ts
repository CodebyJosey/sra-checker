import type { CheckStatus } from '@/domain/checklist/CheckResult';

/**
 * @summary Eén relevant fragment dat met de evaluatie meegaat (RAG-output).
 */
export interface ProviderFragment {
  readonly page: number;
  readonly content: string;
}

/**
 * @summary Input voor één check-evaluatie.
 */
export interface EvaluateCheckInput {
  /** De volledige check-tekst uit de SRA-checklist. */
  readonly description: string;
  /** Wetreferentie zoals "BW 2:384,5", of null. */
  readonly source: string | null;
  /** Top-K fragmenten uit het document, in volgorde van relevantie. */
  readonly fragments: readonly ProviderFragment[];
}

/**
 * @summary Gestructureerde uitvoer van een check-evaluatie.
 *
 * @remarks
 * Bewust een gesloten enum voor `status` plus een vrije-tekst `reasoning`.
 * `pageReference` en `citation` zijn optioneel — sommige checks kunnen
 * alleen op afwezigheid worden beoordeeld ("ik vond dit nergens terug").
 */
export interface EvaluateCheckOutput {
  readonly status: CheckStatus;
  readonly pageReference: number | null;
  readonly citation: string | null;
  readonly reasoning: string;
  /** Voor traceability — welk model produceerde dit antwoord? */
  readonly modelUsed: string;
}

/**
 * @summary Contract waar elke AI-provider aan moet voldoen.
 *
 * @remarks
 * Door dit als interface te modelleren kunnen we morgen een `OpenAIProvider`
 * of `LocalLLMProvider` toevoegen zonder de use-case-laag aan te raken.
 * Dat is ook de literal richtlijn uit de case ("verschillende AI providers").
 */
export interface AIProvider {
  /**
   * Evalueert één SRA-check tegen retrieved fragmenten.
   *
   * @param input - De check + de RAG-output van {@link DocumentRetriever}.
   * @returns Een gevalideerde `EvaluateCheckOutput`.
   * @throws Error bij rate-limit, ongeldige output of netwerkfouten.
   */
  evaluateCheck(input: EvaluateCheckInput): Promise<EvaluateCheckOutput>;
}
