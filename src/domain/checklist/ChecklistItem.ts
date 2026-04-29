/**
 * @summary Welke type rechtspersoon valt onder welke check.
 * @remarks
 * In de SRA-checklist staat per check aangegeven of hij van toepassing is op
 * Grote, Middelgrote en/of Kleine rechtspersonen. Voor deze case zijn we
 * uitsluitend geïnteresseerd in checks waar de markering `i+d`
 * ("informatie + disclosure") staat.
 */
export interface ApplicabilityFlags {
  /** Geldt de check voor Grote rechtspersonen? */
  readonly groot: boolean;
  /** Geldt de check voor Middelgrote rechtspersonen? */
  readonly midden: boolean;
  /** Geldt de check voor Kleine rechtspersonen? */
  readonly klein: boolean;
}

/**
 * @summary Eén individuele controle uit de SRA-checklist.
 *
 * @remarks
 * Een `ChecklistItem` is een **domain entity**: hij bevat de essentie van een
 * check (de tekst, de wetbron, voor wie hij geldt) zónder iets te weten over
 * de database, AI of UI. Persistence-details horen in een Repository (zie
 * `infrastructure/persistence/ChecklistRepository`).
 *
 * @example
 * ```ts
 * const item = ChecklistItem.create({
 *   sheet: 'Grondslagen en uitgangspunten',
 *   ordering: 14,
 *   description: 'De grondslagen van waardering moeten worden opgenomen.',
 *   source: 'BW 2:384,5',
 *   applicability: { groot: true, midden: true, klein: true },
 * });
 *
 * if (item.appliesTo('groot')) {
 *   // run de evaluatie...
 * }
 * ```
 */
export class ChecklistItem {
  private constructor(
    public readonly id: string,
    public readonly sheet: string,
    public readonly ordering: number,
    public readonly description: string,
    public readonly source: string | null,
    public readonly applicability: ApplicabilityFlags,
  ) {}

  /**
   * Maakt een nieuw `ChecklistItem` aan en valideert de invoer.
   *
   * @param props - De ruwe waardes uit de SRA-Excel of de database.
   * @returns Een immutable `ChecklistItem`.
   * @throws Error als de description leeg is of geen enkele applicability-flag aan staat.
   */
  public static create(props: {
    id?: string;
    sheet: string;
    ordering: number;
    description: string;
    source: string | null;
    applicability: ApplicabilityFlags;
  }): ChecklistItem {
    const description = props.description.trim();
    if (description.length === 0) {
      throw new Error('ChecklistItem.description mag niet leeg zijn');
    }
    const { groot, midden, klein } = props.applicability;
    if (!groot && !midden && !klein) {
      throw new Error('ChecklistItem moet voor minstens één rechtspersoon-type gelden');
    }
    return new ChecklistItem(
      props.id ?? crypto.randomUUID(),
      props.sheet.trim(),
      props.ordering,
      description,
      props.source?.trim() ?? null,
      props.applicability,
    );
  }

  /**
   * Geeft aan of deze check van toepassing is op het opgegeven type rechtspersoon.
   *
   * @param type - Het type rechtspersoon dat we willen toetsen.
   */
  public appliesTo(type: 'groot' | 'midden' | 'klein'): boolean {
    return this.applicability[type];
  }

  /**
   * Compacte string voor logs en debugging.
   *
   * @returns Een string als `[Grondslagen en uitgangspunten #14] BW 2:384,5`.
   */
  public toLabel(): string {
    const sourcePart = this.source ? ` ${this.source}` : '';
    return `[${this.sheet} #${this.ordering}]${sourcePart}`;
  }
}
