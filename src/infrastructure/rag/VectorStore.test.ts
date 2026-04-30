import { describe, it, expect } from 'vitest';
import { VectorStore } from './VectorStore';

describe('VectorStore.cosine', () => {
  it('identieke vectoren → 1', () => {
    expect(VectorStore.cosine([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it('orthogonale vectoren → 0', () => {
    expect(VectorStore.cosine([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('tegengestelde vectoren → -1', () => {
    expect(VectorStore.cosine([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it('faalt op mismatched lengte', () => {
    expect(() => VectorStore.cosine([1, 0], [1, 0, 0])).toThrow(/Vector-mismatch/);
  });

  it('werkt onafhankelijk van magnitude', () => {
    // Beide vectoren wijzen dezelfde kant op, alleen anders geschaald.
    expect(VectorStore.cosine([1, 1], [3, 3])).toBeCloseTo(1);
  });
});

describe('VectorStore.search', () => {
  it('rangschikt op cosine score, top-K', () => {
    const records = [
      { embedding: [1, 0, 0], payload: { id: 'a' } },
      { embedding: [0, 1, 0], payload: { id: 'b' } },
      { embedding: [0.9, 0.1, 0], payload: { id: 'c' } },
    ];
    const result = VectorStore.search([1, 0, 0], records, 2);
    expect(result).toHaveLength(2);
    expect(result[0]?.payload.id).toBe('a');
    expect(result[1]?.payload.id).toBe('c');
  });

  it('topK=0 → lege array', () => {
    expect(VectorStore.search([1, 0], [], 5)).toEqual([]);
  });
});
