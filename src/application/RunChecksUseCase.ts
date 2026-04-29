import type { AIProvider } from '@/infrastructure/ai/AIProvider';
import type { ChecklistRepository } from '@/infrastructure/persistence/ChecklistRepository';
import type { CheckResultRepository } from '@/infrastructure/persistence/CheckResultRepository';
import type { DocumentRetriever } from '@/infrastructure/rag/DocumentRetriever';
import type { ChecklistItem } from '@/domain/checklist/ChecklistItem';
 
export type RechtspersoonType = 'groot' | 'midden' | 'klein';
 
export interface ProgressEvent {
  readonly succeeded: number;
  readonly failed: number;
  readonly total: number;
}
 
export interface RunChecksOutput {
  readonly total: number;
  readonly succeeded: number;
  readonly failed: number;
}
 
/**
 * @summary Voert alle i+d-checks uit voor één document, met per-check progress.
 *
 * @remarks
 * Worker-pool patroon: `CONCURRENCY` workers pakken items uit een gedeelde queue.
 * Zodra een check klaar is wordt `onProgress` aangeroepen — niet per batch maar
 * per individuele evaluatie. Voor de UI betekent dat een gestaag oplopende
 * voortgangsbalk in plaats van schokkerige sprongen.
 */
export class RunChecksUseCase {
  private static readonly CONCURRENCY = 2;
  private static readonly TOP_K = 8;
 
  public constructor(
    private readonly retriever: DocumentRetriever,
    private readonly provider: AIProvider,
    private readonly checklists: ChecklistRepository,
    private readonly results: CheckResultRepository,
  ) {}
 
  public async execute(
    documentId: string,
    checklistId: string,
    sheet: string,
    type: RechtspersoonType = 'midden',
    onProgress?: (event: ProgressEvent) => void,
  ): Promise<RunChecksOutput> {
    const items = await this.checklists.findApplicable(checklistId, sheet, type);
    const total = items.length;
    let succeeded = 0;
    let failed = 0;
 
    // Eerste event: laat de UI weten dat we begonnen zijn én hoeveel checks er komen.
    onProgress?.({ succeeded: 0, failed: 0, total });
 
    // Worker-pool: gedeelde queue, vaste hoeveelheid concurrent workers.
    const queue = [...items];
    const worker = async (): Promise<void> => {
      while (true) {
        const item = queue.shift();
        if (!item) return;
        try {
          await this.evaluateOne(documentId, item);
          succeeded += 1;
        } catch (err) {
          failed += 1;
          console.error(
            '  ✗ Check failed:',
            err instanceof Error ? err.message : err,
          );
        }
        onProgress?.({ succeeded, failed, total });
      }
    };
 
    await Promise.all(
      Array.from({ length: Math.min(RunChecksUseCase.CONCURRENCY, total) }, () => worker()),
    );
 
    return { total, succeeded, failed };
  }
 
  private async evaluateOne(documentId: string, item: ChecklistItem): Promise<void> {
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
 