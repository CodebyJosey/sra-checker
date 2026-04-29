import type { CheckResult as DbCheckResult, PrismaClient } from '@prisma/client';
import type { CheckStatus } from '@/domain/checklist/CheckResult';
 
export interface PersistResultInput {
  readonly documentId: string;
  readonly checklistItemId: string;
  readonly status: CheckStatus;
  readonly pageReference: number | null;
  readonly citation: string | null;
  readonly reasoning: string;
  readonly modelUsed: string;
}
 
/**
 * @summary Persistence-laag voor `CheckResult`.
 *
 * @remarks
 * Resultaten zijn idempotent op `(documentId, checklistItemId)` —
 * een re-run overschrijft het oude resultaat.
 */
export class CheckResultRepository {
  public constructor(private readonly prisma: PrismaClient) {}
 
  /**
   * Slaat één evaluatie op (insert of update).
   */
  public async upsert(input: PersistResultInput): Promise<DbCheckResult> {
    return this.prisma.checkResult.upsert({
      where: {
        documentId_checklistItemId: {
          documentId: input.documentId,
          checklistItemId: input.checklistItemId,
        },
      },
      create: { ...input },
      update: {
        status: input.status,
        pageReference: input.pageReference,
        citation: input.citation,
        reasoning: input.reasoning,
        modelUsed: input.modelUsed,
      },
    });
  }
 
  /**
   * Lijst van resultaten voor één document, met de bijbehorende
   * checklist-items voor weergave.
   */
  public async findByDocument(documentId: string) {
    return this.prisma.checkResult.findMany({
      where: { documentId },
      include: { checklistItem: true },
      orderBy: [
        { checklistItem: { sheet: 'asc' } },
        { checklistItem: { ordering: 'asc' } },
      ],
    });
  }
 
  /**
   * Aantal resultaten per status — handig voor dashboard-summaries.
   */
  public async statusCounts(documentId: string): Promise<Record<CheckStatus, number>> {
    const grouped = await this.prisma.checkResult.groupBy({
      by: ['status'],
      where: { documentId },
      _count: { _all: true },
    });
    const init: Record<CheckStatus, number> = {
      PASS: 0,
      FAIL: 0,
      NOT_APPLICABLE: 0,
      UNCERTAIN: 0,
    };
    for (const row of grouped) {
      if (row.status in init) {
        init[row.status as CheckStatus] = row._count._all;
      }
    }
    return init;
  }
}