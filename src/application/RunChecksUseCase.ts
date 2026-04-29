import type { AIProvider } from '@/infrastructure/ai/AIProvider';
import type { ChecklistRepository } from '@/infrastructure/persistence/ChecklistRepository';
import type { CheckResultRepository } from '@/infrastructure/persistence/CheckResultRepository';
import type { DocumentRetriever } from '@/infrastructure/rag/DocumentRetriever';
 
export type RechtspersoonType = 'groot' | 'midden' | 'klein';
 
export interface RunChecksOutput {
  readonly total: number;
  readonly succeeded: number;
  readonly failed: number;
}
 
/**
 * @summary Voert alle i+d-checks uit voor één document.
 *
 * @remarks
 * Per check:
 * 1. Top-K fragmenten ophalen via RAG.
 * 2. Aan de AI-provider vragen om een oordeel.
 * 3. Resultaat opslaan via {@link CheckResultRepository}.
 *
 * Checks worden in batches van 5 parallel verwerkt — sneller dan sequentieel,
 * maar laag genoeg om binnen de Anthropic rate-limit te blijven (50/min op
 * de gratis tier). `Promise.allSettled` zorgt dat één falende check
 * de rest van de run niet kapot maakt.
 *
 * @example
 * ```ts
 * const useCase = new RunChecksUseCase(retriever, provider, checklistRepo, resultsRepo);
 * const { total, succeeded, failed } = await useCase.execute(documentId, 'midden');
 * ```
 */
export class RunChecksUseCase {
  private static readonly CONCURRENCY = 5;
  private static readonly TOP_K = 5;
 
  public constructor(
    private readonly retriever: DocumentRetriever,
    private readonly provider: AIProvider,
    private readonly checklists: ChecklistRepository,
    private readonly results: CheckResultRepository,
  ) {}
 
  public async execute(
    documentId: string,
    type: RechtspersoonType = 'midden',
  ): Promise<RunChecksOutput> {
    const items = await this.checklists.findApplicable(type);
 
    let succeeded = 0;
    let failed = 0;
 
    for (let i = 0; i < items.length; i += RunChecksUseCase.CONCURRENCY) {
      const batch = items.slice(i, i + RunChecksUseCase.CONCURRENCY);
      const settled = await Promise.allSettled(
        batch.map((item) => this.evaluateOne(documentId, item)),
      );
      for (const r of settled) {
        if (r.status === 'fulfilled') succeeded += 1;
        else {
          failed += 1;
          console.error('Check failed:', r.reason);
        }
      }
    }
 
    return { total: items.length, succeeded, failed };
  }
 
  /**
   * Evalueert één check end-to-end en bewaart het resultaat.
   */
  private async evaluateOne(
    documentId: string,
    item: import('@/domain/checklist/ChecklistItem').ChecklistItem,
  ): Promise<void> {
    const fragments = await this.retriever.retrieve(
      documentId,
      item.description,
      RunChecksUseCase.TOP_K,
    );
 
    const evaluation = await this.provider.evaluateCheck({
      description: item.description,
      source: item.source,
      fragments: fragments.map((f) => ({ page: f.page, content: f.content })),
    });
 
    await this.results.upsert({
      documentId,
      checklistItemId: item.id,
      status: evaluation.status,
      pageReference: evaluation.pageReference,
      citation: evaluation.citation,
      reasoning: evaluation.reasoning,
      modelUsed: evaluation.modelUsed,
    });
  }
}
 