import { describe, test, expect, beforeAll, beforeEach } from 'vitest';
import { createSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import sharp from 'sharp';

// We will call the actual route handlers directly (unit-style integration) by importing them.
import * as createListRoute from '@/app/api/admin/shows/route';
import * as imageRoute from '@/app/api/admin/shows/[id]/image/route';
import * as publishRoute from '@/app/api/admin/shows/[id]/publish/route';
import * as publicFeedRoute from '@/app/api/shows/public/route';

async function resetShows() { await prisma.$executeRawUnsafe('DELETE FROM "Show";'); }

async function adminCookieHeader() {
  const cookie = await createSessionCookie('ADMIN');
  return `admin_session=${cookie}`;
}

async function makeWebpFile(name: string) {
  const raw = Buffer.alloc(5 * 5 * 3, 0);
  for (let i=0;i<raw.length;i+=3){ raw[i]=255; raw[i+1]=0; raw[i+2]=0; }
  const buf = await sharp(raw, { raw: { width:5, height:5, channels:3 } }).webp({ quality:90 }).toBuffer();
  return new File([new Uint8Array(buf)], name, { type: 'image/webp' });
}

function jsonReq(method: string, url: string, body?: any, cookie?: string): Request {
  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function formDataReq(url: string, file: File, cookie?: string): Request {
  const fd = new FormData();
  fd.append('file', file);
  return new Request(url, {
    method: 'POST',
    headers: { ...(cookie ? { cookie } : {}) },
    body: fd as any,
  });
}

async function extractJson(res: any) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error('Invalid JSON response: '+text); }
}

beforeAll(async () => { await prisma.$queryRaw`SELECT 1`; });
beforeEach(async () => { await resetShows(); });

describe('admin shows API flow', () => {
  test('create → image → publish → visible in public feed', async () => {
    const cookie = await adminCookieHeader();
    // create draft
    const createRes = await createListRoute.POST(jsonReq('POST','http://localhost/api/admin/shows',{ title:'Show A', startsAt:new Date().toISOString() }, cookie));
    expect(createRes.status).toBe(201);
    const created = await extractJson(createRes);
    expect(created.ok).toBe(true);
    const id = created.show.id;

    // upload image
    const file = await makeWebpFile('a.webp');
    const imgRes = await imageRoute.POST(formDataReq(`http://localhost/api/admin/shows/${id}/image`, file, cookie), { params: { id } });
    expect(imgRes.status).toBe(200);
    const imgJson = await extractJson(imgRes);
    expect(imgJson.ok).toBe(true);
    expect(imgJson.meta.bytesOriginal).toBeGreaterThan(0);

    // publish
    const pubRes = await publishRoute.POST(jsonReq('POST',`http://localhost/api/admin/shows/${id}/publish`, {}, cookie), { params: { id } });
    expect(pubRes.status).toBe(200);
    const pubJson = await extractJson(pubRes);
    expect(pubJson.show.status).toBe('PUBLISHED');

    // public feed
    const feedRes = await publicFeedRoute.GET();
    expect(feedRes.status).toBe(200);
    const feedJson = await extractJson(feedRes);
    const slugs = feedJson.shows.map((s:any)=>s.slug);
    expect(slugs).toContain(pubJson.show.slug);
  });

  test('límite 4 publicados', async () => {
    const cookie = await adminCookieHeader();
    const ids: string[] = [];
    for (let i=0;i<4;i++) {
      const createRes = await createListRoute.POST(jsonReq('POST','http://localhost/api/admin/shows',{ title:`Show ${i}`, startsAt:new Date(Date.now()+i*1000).toISOString(), slot: i+1 }, cookie));
      const created = await extractJson(createRes);
      ids.push(created.show.id);
      const file = await makeWebpFile(`f${i}.webp`);
      await imageRoute.POST(formDataReq(`http://localhost/api/admin/shows/${created.show.id}/image`, file, cookie), { params: { id: created.show.id } });
      await publishRoute.POST(jsonReq('POST',`http://localhost/api/admin/shows/${created.show.id}/publish`, {}, cookie), { params: { id: created.show.id } });
    }
    // quinto
    const extraCreate = await createListRoute.POST(jsonReq('POST','http://localhost/api/admin/shows',{ title:'Extra', startsAt:new Date().toISOString(), slot:1 }, cookie));
    const extraJson = await extractJson(extraCreate);
    const extraId = extraJson.show.id;
    const file = await makeWebpFile('x.webp');
    await imageRoute.POST(formDataReq(`http://localhost/api/admin/shows/${extraId}/image`, file, cookie), { params: { id: extraId } });
    const extraPublish = await publishRoute.POST(jsonReq('POST',`http://localhost/api/admin/shows/${extraId}/publish`, {}, cookie), { params: { id: extraId } });
    expect(extraPublish.status).toBe(409);
    const body = await extractJson(extraPublish);
    expect(body.code).toBe('MAX_PUBLISHED_REACHED');
  });

  test('slot conflict', async () => {
    const cookie = await adminCookieHeader();
    // first show slot 2
    const c1 = await createListRoute.POST(jsonReq('POST','http://localhost/api/admin/shows',{ title:'Slot2 A', startsAt:new Date().toISOString(), slot:2 }, cookie));
    const j1 = await extractJson(c1);
    const id1 = j1.show.id;
    await imageRoute.POST(formDataReq(`http://localhost/api/admin/shows/${id1}/image`, await makeWebpFile('a.webp'), cookie), { params: { id: id1 } });
    await publishRoute.POST(jsonReq('POST',`http://localhost/api/admin/shows/${id1}/publish`, {}, cookie), { params: { id: id1 } });

    // second same slot 2
    const c2 = await createListRoute.POST(jsonReq('POST','http://localhost/api/admin/shows',{ title:'Slot2 B', startsAt:new Date().toISOString(), slot:2 }, cookie));
    const j2 = await extractJson(c2);
    const id2 = j2.show.id;
    await imageRoute.POST(formDataReq(`http://localhost/api/admin/shows/${id2}/image`, await makeWebpFile('b.webp'), cookie), { params: { id: id2 } });
    const pub2 = await publishRoute.POST(jsonReq('POST',`http://localhost/api/admin/shows/${id2}/publish`, {}, cookie), { params: { id: id2 } });
    const bodyRaw = await extractJson(pub2).catch(e=>({ parseError: String(e) }));
    if (pub2.status !== 409) {
      // Provide debug context
      const existing = await prisma.show.findMany({ where: { status: 'PUBLISHED' }, select: { id:true, slot:true } });
      throw new Error(`Expected 409 SLOT_CONFLICT, got ${pub2.status} body=${JSON.stringify(bodyRaw)} published=${JSON.stringify(existing)}`);
    }
    expect(bodyRaw.code).toBe('SLOT_CONFLICT');
  });
});
