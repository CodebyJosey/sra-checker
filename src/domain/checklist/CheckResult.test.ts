import { describe, it, expect } from 'vitest';
import { CheckResult } from './CheckResult';

describe('CheckResult', () => {
  const baseProps = {
    documentId: 'doc-1',
    checklistItemId: 'check-1',
    status: 'PASS' as const,
    pageReference: 8,
    citation: 'Voorbeeld citaat',
    reasoning: 'Op pagina 8 staat de toelichting.',
    modelUsed: 'claude-sonnet-4-6',
  };

  it('eist een niet-lege onderbouwing', () => {
    expect(() => CheckResult.create({ ...baseProps, reasoning: '   ' })).toThrow(/reasoning/);
  });

  it('weigert negatieve paginareferentie', () => {
    expect(() => CheckResult.create({ ...baseProps, pageReference: 0 })).toThrow(/pageReference/);
  });

  it('staat null pagereference toe', () => {
    const result = CheckResult.create({ ...baseProps, pageReference: null });
    expect(result.pageReference).toBeNull();
  });

  it('needsHumanReview is false bij PASS', () => {
    const result = CheckResult.create(baseProps);
    expect(result.needsHumanReview()).toBe(false);
  });

  it.each(['FAIL', 'UNCERTAIN', 'NOT_APPLICABLE'] as const)(
    'needsHumanReview is true bij %s',
    (status) => {
      const result = CheckResult.create({ ...baseProps, status });
      expect(result.needsHumanReview()).toBe(true);
    },
  );

  it('zet evaluatedAt automatisch', () => {
    const before = Date.now();
    const result = CheckResult.create(baseProps);
    const after = Date.now();
    expect(result.evaluatedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.evaluatedAt.getTime()).toBeLessThanOrEqual(after);
  });
});
