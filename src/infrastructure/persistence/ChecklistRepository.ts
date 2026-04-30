import type { Checklist as DbChecklist, PrismaClient } from '@prisma/client';
import { ChecklistItem } from '@/domain/checklist/ChecklistItem';

type ChecklistRow = {
  id: string;
  name: string;
  filename: string;
  createdAt: Date;
  sheets: string;
};

/**
 * Beschrijving van één sheet uit een Checklist, voor UI-gebruik.
 */
export interface SheetSummary {
  readonly name: string;
  readonly idCount: number;
}

export interface ChecklistSummary {
  readonly id: string;
  readonly name: string;
  readonly filename: string;
  readonly createdAt: Date;
  readonly sheets: readonly SheetSummary[];
}

/**
 * @summary Persistence-laag voor `Checklist` en zijn `ChecklistItem`s.
 */
export class ChecklistRepository {
  // PrismaClient type may not include generated model delegates in some setups;
  // widen the type to include the used delegates to avoid TS errors.
  public constructor(
    private readonly prisma: PrismaClient & { checklist: any; checklistItem: any },
  ) {}

  /**
   * Maakt een nieuwe `Checklist` aan en schrijft alle items in één transactie.
   *
   * @returns Het ID van de nieuwe Checklist.
   */
  public async createWithItems(input: {
    userId: string;
    name: string;
    filename: string;
    storagePath: string;
    sheets: readonly SheetSummary[];
    items: readonly ChecklistItem[];
  }): Promise<string> {
    const checklist = await this.prisma.checklist.create({
      data: {
        userId: input.userId,
        name: input.name,
        filename: input.filename,
        storagePath: input.storagePath,
        sheets: JSON.stringify(input.sheets),
      },
    });

    if (input.items.length > 0) {
      // SQLite maximaal ~500 vars per insert — splitsen voor de zekerheid.
      const batchSize = 100;
      for (let i = 0; i < input.items.length; i += batchSize) {
        const batch = input.items.slice(i, i + batchSize);
        await this.prisma.checklistItem.createMany({
          data: batch.map((item) => ({
            id: item.id,
            checklistId: checklist.id,
            sheet: item.sheet,
            ordering: item.ordering,
            description: item.description,
            source: item.source,
            appliesGroot: item.applicability.groot,
            appliesMidden: item.applicability.midden,
            appliesKlein: item.applicability.klein,
          })),
        });
      }
    }

    return checklist.id;
  }

  /**
   * Lijst van alle checklists van één gebruiker, voor de UI-selector.
   */
  public async listByUser(userId: string): Promise<ChecklistSummary[]> {
    const rows = await this.prisma.checklist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row: any) => this.toSummary(row));
  }

  /**
   * Eén checklist met ownership-check.
   */
  public async findOwned(id: string, userId: string): Promise<ChecklistSummary | null> {
    const row = await this.prisma.checklist.findFirst({ where: { id, userId } });
    return row ? this.toSummary(row) : null;
  }

  /**
   * Alle items in een checklist+sheet die voor het opgegeven type rechtspersoon
   * gelden.
   */
  public async findApplicable(
    checklistId: string,
    sheet: string,
    type: 'groot' | 'midden' | 'klein',
  ): Promise<ChecklistItem[]> {
    const where = {
      checklistId,
      sheet,
      ...(type === 'groot'
        ? { appliesGroot: true }
        : type === 'midden'
          ? { appliesMidden: true }
          : { appliesKlein: true }),
    };

    const rows = await this.prisma.checklistItem.findMany({
      where,
      orderBy: { ordering: 'asc' },
    });

    return rows.map(
      (r: {
        id: string;
        appliesKlein: boolean;
        appliesMidden: boolean;
        appliesGroot: boolean;
        sheet: string;
        ordering: number;
        description: string;
        source: string | null;
      }) => this.itemToDomain(r),
    );
  }

  private toSummary(row: ChecklistRow): ChecklistSummary {
    let sheets: SheetSummary[] = [];
    try {
      const parsed = JSON.parse(row.sheets) as unknown;
      if (Array.isArray(parsed)) {
        sheets = parsed.filter(
          (s): s is SheetSummary =>
            typeof s === 'object' &&
            s !== null &&
            'name' in s &&
            'idCount' in s &&
            typeof (s as { name: unknown }).name === 'string' &&
            typeof (s as { idCount: unknown }).idCount === 'number',
        );
      }
    } catch {
      sheets = [];
    }

    return {
      id: row.id,
      name: row.name,
      filename: row.filename,
      createdAt: row.createdAt,
      sheets,
    };
  }

  private itemToDomain(row: {
    id: string;
    sheet: string;
    ordering: number;
    description: string;
    source: string | null;
    appliesGroot: boolean;
    appliesMidden: boolean;
    appliesKlein: boolean;
  }): ChecklistItem {
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
