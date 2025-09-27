import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createDraft, publish } from '@/lib/shows/service';

// Helpers
async function resetShows() {
  await prisma.$executeRawUnsafe('DELETE FROM "Show";');
}

function makeImageData() {
  return {
    imageOriginalPath: 'orig/path',
    imageWebpPath: 'webp/path',
    imageBlurData: 'data:blur',
    width: 100,
    height: 80,
    bytesOriginal: 12345,
    bytesOptimized: 6789,
  };
}

async function forceImage(id: string) {
  await prisma.show.update({ where: { id }, data: makeImageData() });
}

beforeAll(async () => {
  // ensure db is reachable
  await prisma.$queryRaw`SELECT 1`;
});

beforeEach(async () => {
  await resetShows();
});

describe('shows/service', () => {
  test('create_draft_success', async () => {
    const draft = await createDraft({ title: 'My Concert', startsAt: new Date().toISOString() });
    expect(draft.id).toBeTruthy();
    expect(draft.status).toBe('DRAFT');
    expect(draft.slug).toMatch(/my-concert/);
    expect(draft.imageWebpPath).toBe(''); // placeholder
  });

  test('publish_without_image_fails', async () => {
    const draft = await createDraft({ title: 'No Img', startsAt: new Date().toISOString() });
    await expect(publish(draft.id)).rejects.toMatchObject({ code: 'IMAGE_REQUIRED' });
  });

  test('publish_limit_exceeded', async () => {
    // Create 4 published active shows
    const now = Date.now();
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) {
      const d = await createDraft({ title: 'Show '+i, startsAt: new Date(now + i * 1000).toISOString(), slot: i+1 });
      await forceImage(d.id);
      const pub = await publish(d.id);
      ids.push(pub.id);
    }
    // Fifth
    const extra = await createDraft({ title: 'Extra', startsAt: new Date(now + 5000).toISOString(), slot: 1 });
    await forceImage(extra.id);
    // Use conflicting or not — limit should trigger before slot conflict because 4 already
    await expect(publish(extra.id)).rejects.toMatchObject({ code: 'MAX_PUBLISHED_REACHED' });
  });

  test('slot_conflict_on_publish', async () => {
    // Published occupying slot 2
    const a = await createDraft({ title: 'Slot2 A', startsAt: new Date().toISOString(), slot: 2 });
    await forceImage(a.id);
    await publish(a.id);
    // Another draft same slot
    const b = await createDraft({ title: 'Slot2 B', startsAt: new Date(Date.now()+1000).toISOString(), slot: 2 });
    await forceImage(b.id);
    await expect(publish(b.id)).rejects.toMatchObject({ code: 'SLOT_CONFLICT' });
  });

  test('publish_sets_publishedAt_once', async () => {
    const d = await createDraft({ title: 'One Time', startsAt: new Date().toISOString() });
    await forceImage(d.id);
    const first = await publish(d.id);
    const firstPublishedAt = first.publishedAt;
    expect(firstPublishedAt).toBeTruthy();
    // Try publish again (idempotent)
    const second = await publish(d.id);
    expect(second.publishedAt?.getTime()).toBe(firstPublishedAt?.getTime());
  });
});
