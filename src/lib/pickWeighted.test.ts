import { describe, it, expect } from 'vitest';
import { pickWeighted, pickWeightedWithRng } from './pickWeighted';

describe('pickWeighted validation', () => {
  it('throws on empty array', () => {
    expect(() => pickWeighted([] as any)).toThrowError('WEIGHTED_EMPTY');
  });
  it('throws on bad weight', () => {
    expect(() => pickWeighted([{ id: 'a', weight: 0 } as any])).toThrowError('WEIGHTED_BAD_WEIGHT');
  });
  it('throws on bad id', () => {
    expect(() => pickWeighted([{ id: 123 as any, weight: 1 } as any])).toThrowError('WEIGHTED_BAD_ID');
  });
});

describe('pickWeighted distribution (deterministic RNG injection)', () => {
  it('respects relative weights ~ counts', () => {
    // We'll iterate rng values evenly spaced to avoid flakiness due to Math.random.
    // Elements: A weight 1, B weight 3, C weight 6 => total 10.
    const elems = [
      { id: 'A', weight: 1 },
      { id: 'B', weight: 3 },
      { id: 'C', weight: 6 },
    ];
    const total = 10;
    const iterations = 10_000; // multiple of total for uniform coverage.
    const counts: Record<string, number> = { A: 0, B: 0, C: 0 };
    for (let i = 0; i < iterations; i++) {
      const r = (i % total) / total; // deterministic cycle 0..0.9
      const id = pickWeightedWithRng(elems as any, () => r);
      counts[id]++;
    }
    // Expected proportions: A 10%, B 30%, C 60%
    const ratioA = counts.A / iterations;
    const ratioB = counts.B / iterations;
    const ratioC = counts.C / iterations;
    // Allow small absolute tolerance since deterministic cycle yields exact counts.
    expect(ratioA).toBeCloseTo(0.1, 3);
    expect(ratioB).toBeCloseTo(0.3, 3);
    expect(ratioC).toBeCloseTo(0.6, 3);
  });
});
