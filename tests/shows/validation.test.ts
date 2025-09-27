import { describe, test, expect } from 'vitest';
import { createDraft } from '@/lib/shows/service';
import { prisma } from '@/lib/prisma';

async function reset() { await prisma.$executeRawUnsafe('DELETE FROM "Show";'); }

function isoOffset(days: number) {
  return new Date(Date.now() + days * 24*60*60*1000).toISOString();
}

describe('shows validation hardening', () => {
  test('START_TOO_FAR (>365d future)', async () => {
    await reset();
    await expect(createDraft({ title: 'Future', startsAt: isoOffset(370) })).rejects.toMatchObject({ code: 'START_TOO_FAR' });
  });
  test('START_TOO_OLD (>365d past)', async () => {
    await reset();
    await expect(createDraft({ title: 'Past', startsAt: isoOffset(-370) })).rejects.toMatchObject({ code: 'START_TOO_OLD' });
  });
  test('INVALID_SLUG illegal chars', async () => {
    await reset();
    await expect(createDraft({ title: 'Bad', slug: 'inv@lid_slug', startsAt: new Date().toISOString() })).rejects.toMatchObject({ code: 'INVALID_SLUG' });
  });
  test('valid slug passes', async () => {
    await reset();
    const d = await createDraft({ title: 'Ok', slug: 'custom-slug-123', startsAt: new Date().toISOString() });
    expect(d.slug).toMatch(/custom-slug-123/);
  });
});
