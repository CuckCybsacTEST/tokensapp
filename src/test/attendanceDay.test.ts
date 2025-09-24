import { describe, it, expect } from 'vitest';
import { computeBusinessDayFromUtc } from '../lib/attendanceDay';

// Cutoff local: 10 (America/Lima UTC-5) => shiftHours = 10 + 5 = 15
// Casos:
// 1. 2025-09-23T21:05:00Z => 16:05 local (>=10:00 => pertenece a 23) -> businessDay 2025-09-23
// 2. 2025-09-24T08:30:00Z => 03:30 local (<10:00 => sigue siendo ventana del 23) -> 2025-09-23
// 3. 2025-09-24T15:59:59Z => 10:59:59 local (>=10 => ventana nuevo día 24) -> 2025-09-24
// 4. 2025-09-24T14:05:00Z => 09:05 local (<10:00 => ventana día 23) -> 2025-09-23

describe('computeBusinessDayFromUtc', () => {
  const cutoff = 10;
  const cases: Array<{ iso: string; expected: string; note: string }> = [
    { iso: '2025-09-23T21:05:00.000Z', expected: '2025-09-23', note: '16:05 local -> mismo día' },
    { iso: '2025-09-24T08:30:00.000Z', expected: '2025-09-23', note: '03:30 local -> día anterior (antes del cutoff)' },
    { iso: '2025-09-24T15:59:59.000Z', expected: '2025-09-24', note: '10:59:59 local -> nuevo día' },
    { iso: '2025-09-24T14:05:00.000Z', expected: '2025-09-23', note: '09:05 local -> todavía ventana del 23' },
  ];

  for (const c of cases) {
    it(`${c.iso} => ${c.expected} (${c.note})`, () => {
      const bd = computeBusinessDayFromUtc(c.iso, cutoff);
      expect(bd).toBe(c.expected);
    });
  }
});
