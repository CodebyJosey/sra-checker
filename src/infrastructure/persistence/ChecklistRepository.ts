import { PrismaClient, type ChecklistItem as DbChecklistItem } from '@prisma/client';
import { ChecklistItem } from '@/domain/checklist/ChecklistItem';
 
/**
 * @summary Persistence-laag voor `ChecklistItem`s.
 *
 * @remarks
 * Vertaalt tussen het database-record en de domain entity. Geen route, use-case
 * of UI-laag praat ooit direct met Prisma voor checklist items — alles gaat
 * via deze class. Dat houdt het mogelijk om later van database te wisselen
 * zonder de domain-laag aan te raken.
 *
 * @example
 * ```ts
 * const repo = new ChecklistRepository(prisma);
 * const items = await repo.findApplicable('groot');
 * ```
 */
export class ChecklistRepository {
  /**
   * @param prisma - De gedeelde Prisma-client (zie `prisma.ts`).
   */
  public constructor(private readonly prisma: PrismaClient) {}
 
  /**
   * Zoekt alle ChecklistItems die voor het opgegeven type rechtspersoon gelden.
   *
   * @param type - Het type rechtspersoon (`groot`, `midden`, of `klein`).
   * @returns Domain `ChecklistItem`-instanties (geen DB-rows).
   */
  public async findApplicable(
    type: 'groot' | 'midden' | 'klein',
  ): Promise<ChecklistItem[]> {
    const where =
      type === 'groot'
        ? { appliesGroot: true }
        : type === 'midden'
          ? { appliesMidden: true }
          : { appliesKlein: true };
 
    const rows = await this.prisma.checklistItem.findMany({
      where,
      orderBy: [{ sheet: 'asc' }, { ordering: 'asc' }],
    });
 
    return rows.map((r) => this.toDomain(r));
  }
 
  /**
   * Schrijft (insert of update) een lijst items in één transactie.
   *
   * @param items - De domain-objecten die geseed of geüpdatet moeten worden.
   * @returns Het aantal upserted items.
   */
  public async upsertMany(items: ChecklistItem[]): Promise<number> {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.checklistItem.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            sheet: item.sheet,
            ordering: item.ordering,
            description: item.description,
            source: item.source,
            appliesGroot: item.applicability.groot,
            appliesMidden: item.applicability.midden,
            appliesKlein: item.applicability.klein,
          },
          update: {
            sheet: item.sheet,
            ordering: item.ordering,
            description: item.description,
            source: item.source,
            appliesGroot: item.applicability.groot,
            appliesMidden: item.applicability.midden,
            appliesKlein: item.applicability.klein,
          },
        }),
      ),
    );
    return items.length;
  }
 
  /**
   * Telt het aantal items per sheet — handig voor seed-feedback en debugging.
   */
  public async countBySheet(): Promise<Record<string, number>> {
    const grouped = await this.prisma.checklistItem.groupBy({
      by: ['sheet'],
      _count: { _all: true },
    });
    return Object.fromEntries(grouped.map((g) => [g.sheet, g._count._all]));
  }
 
  /**
   * Mapper van DB-row naar domain entity.
   *
   * @param row - Rauwe Prisma-record.
   * @returns Een gevalideerd `ChecklistItem` domain object.
   */
  private toDomain(row: DbChecklistItem): ChecklistItem {
    return ChecklistItem.create({
      id: row.id,
      sheet: row.sheet,
      ordering: row.ordering,
      description: row.description,
      source: row.source,
      applicability: {
        groot: row.appliesGroot,
        midden: row.appliesMidden,
        klein: row.appliesKlein,
      },
    });
  }
}
 