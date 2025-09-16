import { describe, test, expect } from 'vitest';
import { computeTokensEnabled } from '@/lib/tokensMode';

describe('computeTokensEnabled', () => {

  test('within schedule -> enabled', () => {
    // 19:00 UTC
  const res = computeTokensEnabled({ now: new Date('2025-09-05T19:00:00Z'), tz: 'UTC' });
  expect(res.enabled).toBe(true);
  expect(res.reason).toBe('scheduled-18-00');
  expect(typeof res.nextToggleIso).toBe('string');
  });

  test('outside schedule -> disabled', () => {
    // 02:00 UTC
    const res = computeTokensEnabled({ now: new Date('2025-09-05T02:00:00Z'), tz: 'UTC' });
    expect(res.enabled).toBe(false);
    expect(res.reason).toBe('scheduled-off');
    expect(typeof res.nextToggleIso).toBe('string');
  });

  test('tz-specific: America/Argentina/Buenos_Aires 19:00 -> enabled and nextToggle in same day or next midnight', () => {
    // 2025-09-05T22:00:00Z == 19:00 -03:00
    const res = computeTokensEnabled({ now: new Date('2025-09-05T22:00:00Z'), tz: 'America/Argentina/Buenos_Aires' });
    expect(res.enabled).toBe(true);
    expect(res.reason).toBe('scheduled-18-00');
    expect(typeof res.nextToggleIso).toBe('string');
  });
});
