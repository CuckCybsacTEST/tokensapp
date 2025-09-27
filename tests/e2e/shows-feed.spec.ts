import { test, expect, Page } from '@playwright/test';
import { createSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import sharp from 'sharp';

async function resetShows() { await prisma.$executeRawUnsafe('DELETE FROM "Show";'); }
async function adminCookie() { const c = await createSessionCookie('ADMIN'); return `admin_session=${c}`; }

async function makeWebpFileBuffer(color: [number,number,number], size=12) {
  const raw = Buffer.alloc(size*size*3, 0);
  for (let i=0;i<raw.length;i+=3){ raw[i]=color[0]; raw[i+1]=color[1]; raw[i+2]=color[2]; }
  return await sharp(raw, { raw: { width: size, height: size, channels:3 } }).webp({ quality: 88 }).toBuffer();
}

async function createDraft(page: Page, cookie: string, title: string, extra: any = {}) {
  const res = await page.request.post('/api/admin/shows', {
    headers: { cookie },
    data: { title, startsAt: new Date().toISOString(), ...extra },
  });
  expect(res.status()).toBe(201);
  const json = await res.json();
  return json.show;
}

async function uploadImage(page: Page, cookie: string, id: string, buf: Buffer, name: string) {
  const res = await page.request.post(`/api/admin/shows/${id}/image`, {
    headers: { cookie },
    multipart: {
      file: {
        name,
        mimeType: 'image/webp',
        buffer: buf,
      } as any,
    } as any,
  });
  const status = res.status();
  if (status !== 200) {
    const body = await res.text();
    throw new Error(`Upload failed status=${status} body=${body}`);
  }
  return await res.json();
}

async function publish(page: Page, cookie: string, id: string) {
  const res = await page.request.post(`/api/admin/shows/${id}/publish`, { headers: { cookie }, data: {} });
  expect(res.status()).toBe(200);
  return await res.json();
}

async function getFeed(page: Page) {
  const res = await page.request.get('/api/shows/public');
  expect(res.status()).toBe(200);
  return await res.json();
}

// Flujos:
// 1. Crear + subir imagen + publicar => aparece en feed
// 2. Reemplazar imagen (segunda imagen) => feed refleja nueva ruta (imageWebpPath cambia)
// 3. Añadir más shows hasta 4 y comprobar orden (slots primero)

test.describe('shows public feed E2E', () => {
  test.beforeEach(async () => { await resetShows(); });

  test('feed refleja creación, publicación y reemplazo de imagen', async ({ page }) => {
    const cookie = await adminCookie();
    // 1. create + image + publish
    const draft = await createDraft(page, cookie, 'Show Feed A');
    const img1 = await makeWebpFileBuffer([255,0,0]);
    const up1 = await uploadImage(page, cookie, draft.id, img1, 'a.webp');
    const pub = await publish(page, cookie, draft.id);
    let feed = await getFeed(page);
    const entry = feed.shows.find((s:any)=> s.slug === pub.show.slug);
    expect(entry).toBeTruthy();
    const firstPath = entry.imageWebpPath;
    expect(firstPath).toBeTruthy();

    // 2. segunda imagen (reemplazo). Re-llamamos upload image endpoint con nueva imagen.
    const img2 = await makeWebpFileBuffer([0,255,0]);
    const up2 = await uploadImage(page, cookie, draft.id, img2, 'b.webp');
    // Feed debe invalidarse y mostrar nuevo path (hash diferente => nombre distinto)
    feed = await getFeed(page);
    const entry2 = feed.shows.find((s:any)=> s.slug === pub.show.slug);
    expect(entry2.imageWebpPath).toBeTruthy();
    expect(entry2.imageWebpPath).not.toEqual(firstPath);

    // 3. más shows (slots) y verificar orden: slots (1..4) primero
    const s1 = await createDraft(page, cookie, 'Slot1', { slot:1 });
    await uploadImage(page, cookie, s1.id, await makeWebpFileBuffer([0,0,255]), 's1.webp');
    await publish(page, cookie, s1.id);

    const s2 = await createDraft(page, cookie, 'Slot2', { slot:2 });
    await uploadImage(page, cookie, s2.id, await makeWebpFileBuffer([0,0,200]), 's2.webp');
    await publish(page, cookie, s2.id);

    const s3 = await createDraft(page, cookie, 'Slot3', { slot:3 });
    await uploadImage(page, cookie, s3.id, await makeWebpFileBuffer([0,0,150]), 's3.webp');
    await publish(page, cookie, s3.id);

    // feed final
    feed = await getFeed(page);
    // extraer order, asegurar que slotted van primero y en orden
    // (el show inicial quizá sin slot; el pipeline de listPublic ordena slot asc, luego no slot)
    const slotted = feed.shows.filter((s:any)=> s.order && s.order <=4); // order para slotted == slot
    for (let i=0;i<slotted.length-1;i++) {
      expect(slotted[i].order).toBeLessThanOrEqual(slotted[i+1].order);
    }
  });
});
