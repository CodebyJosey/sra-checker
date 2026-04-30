import { describe, it, expect } from 'vitest';
import { ChecklistItem } from './ChecklistItem';

describe('ChecklistItem', () => {
  const baseProps = {
    sheet: 'Grondslagen en uitgangspunten',
    ordering: 10,
    description: 'De grondslagen van waardering moeten worden opgenomen.',
    source: 'BW 2:384,5',
    applicability: { groot: true, midden: true, klein: true } as const,
  };

  it('valideert verplichte velden', () => {
    expect(() => ChecklistItem.create({ ...baseProps, description: '   ' })).toThrow(/leeg/);
  });

  it('eist minstens één applicability-flag', () => {
    expect(() =>
      ChecklistItem.create({
        ...baseProps,
        applicability: { groot: false, midden: false, klein: false },
      }),
    ).toThrow(/minstens één/);
  });

  it('appliesTo respecteert de flags', () => {
    const item = ChecklistItem.create({
      ...baseProps,
      applicability: { groot: false, midden: true, klein: false },
    });
    expect(item.appliesTo('groot')).toBe(false);
    expect(item.appliesTo('midden')).toBe(true);
    expect(item.appliesTo('klein')).toBe(false);
  });

  it('toLabel format inclusief bron', () => {
    const item = ChecklistItem.create(baseProps);
    expect(item.toLabel()).toBe('[Grondslagen en uitgangspunten #10] BW 2:384,5');
  });

  it('toLabel zonder bron', () => {
    const item = ChecklistItem.create({ ...baseProps, source: null });
    expect(item.toLabel()).toBe('[Grondslagen en uitgangspunten #10]');
  });

  it('genereert id als niet meegegeven', () => {
    const a = ChecklistItem.create(baseProps);
    const b = ChecklistItem.create(baseProps);
    expect(a.id).not.toBe(b.id);
    expect(a.id.length).toBeGreaterThan(8);
  });
});
