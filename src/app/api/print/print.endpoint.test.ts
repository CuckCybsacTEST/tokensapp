import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { initTestDb } from '@/test/setupTestDb';
import { createSessionCookie } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { GET as printGet } from '@/app/api/print/batch/[id]/pdf/route';

let prisma: PrismaClient;
let serverUrl = 'http://localhost:3000';

async function seedBatchWithTokens(batchId: string, count: number) {
  // Limpieza específica (ya se truncó pero por claridad)
  await prisma.token.deleteMany({});
  await prisma.batch.deleteMany({});
  await prisma.prize.deleteMany({});
  const batch = await prisma.batch.create({ data: { id: batchId, description: 'test' } });
  await prisma.prize.create({ data: { id: 'p1', key: 'p1', label: 'P1', active: true, emittedTotal: 0 } });
  const expiresAt = new Date(Date.now() + 60_000);
  const data = Array.from({ length: count }).map((_, i) => ({
    id: `p1_tok${i}`,
    prizeId: 'p1',
    batchId: batch.id,
    expiresAt,
    signature: 'sig',
    signatureVersion: 1,
    disabled: false,
  }));
  // createMany para velocidad
  if (data.length) {
    await prisma.token.createMany({ data });
  }
}

beforeAll(async () => {
  prisma = await initTestDb('test_print.db');
  (global as any)._prisma = prisma;
  // Ensure a default template image exists for the print endpoint tests
  const outDir = path.resolve(process.cwd(), 'public', 'templates');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const defaultPngPath = path.join(outDir, 'default.png');
  // Create a reasonably large white PNG (800x1200) so QR composition fits
  try {
    // require sharp locally to avoid adding top-level dependency for tests
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sharp = require('sharp');
    const buf = await sharp({ create: { width: 800, height: 1200, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toBuffer();
    fs.writeFileSync(defaultPngPath, new Uint8Array(buf));
  } catch (e) {
    // fallback: write a small PNG so tests still run but composition may fail
    const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    fs.writeFileSync(defaultPngPath, new Uint8Array(Buffer.from(tinyPngBase64, 'base64')));
  }
  // create a PrintTemplate DB record to mimic admin upload flow
  // Crear / asegurar plantilla de impresión
  await prisma.printTemplate.upsert({
    where: { id: 'test-default' },
    update: { name: 'default', filePath: 'public/templates/default.png', meta: JSON.stringify({ dpi: 300, cols: 2, rows: 4, qr: { xMm: 150, yMm: 230, widthMm: 30 } }) },
    create: { id: 'test-default', name: 'default', filePath: 'public/templates/default.png', meta: JSON.stringify({ dpi: 300, cols: 2, rows: 4, qr: { xMm: 150, yMm: 230, widthMm: 30 } }) }
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Print PDF endpoint', () => {
  it('returns PDF for batch with 1 token (1 page)', async () => {
    const batchId = 'print1';
    await seedBatchWithTokens(batchId, 1);

    // create admin cookie
    const cookie = await createSessionCookie('ADMIN');

  const req = new Request(`http://localhost/api/print/batch/${batchId}/pdf`, { method: 'GET', headers: { cookie: `admin_session=${cookie}` } });
  const res = await printGet(req as any, { params: { id: batchId } }) as any;

  expect(res.status).toBe(200);
  expect(res.headers.get('content-type') || '').toContain('application/pdf');
  const buf = await res.arrayBuffer();
    const pdf = await PDFDocument.load(buf);
    // For 1 token we still render a full A4 page (may contain single template)
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(Number(res.headers.get('x-tokens-processed') || '0')).toBe(1);
  }, 60000);

  it('returns single page for 8 tokens', async () => {
    const batchId = 'print8';
    await seedBatchWithTokens(batchId, 8);
    const cookie = await createSessionCookie('ADMIN');
  const req = new Request(`http://localhost/api/print/batch/${batchId}/pdf`, { method: 'GET', headers: { cookie: `admin_session=${cookie}` } });
  const res = await printGet(req as any, { params: { id: batchId } }) as any;
  expect(res.status).toBe(200);
  const buf = await res.arrayBuffer();
  const pdf = await PDFDocument.load(buf);
    expect(pdf.getPageCount()).toBe(1);
    expect(Number(res.headers.get('x-tokens-processed') || '0')).toBe(8);
  }, 60000);

  it('returns two pages for 9 tokens', async () => {
    const batchId = 'print9';
    await seedBatchWithTokens(batchId, 9);
    const cookie = await createSessionCookie('ADMIN');
  const req = new Request(`http://localhost/api/print/batch/${batchId}/pdf`, { method: 'GET', headers: { cookie: `admin_session=${cookie}` } });
  const res = await printGet(req as any, { params: { id: batchId } }) as any;
  expect(res.status).toBe(200);
  const buf = await res.arrayBuffer();
  const pdf = await PDFDocument.load(buf);
    expect(pdf.getPageCount()).toBe(2);
    expect(Number(res.headers.get('x-tokens-processed') || '0')).toBe(9);
  }, 60000);

  it('returns 401 when unauthenticated', async () => {
    const batchId = 'print1';
  const req = new Request(`http://localhost/api/print/batch/${batchId}/pdf`, { method: 'GET' });
  const res = await printGet(req as any, { params: { id: batchId } }) as any;
  expect(res.status).toBe(401);
  const j = await res.json().catch(() => ({}));
  expect(j.error).toBe('UNAUTHORIZED');
  });

  it('returns 403 for non-admin role', async () => {
    const batchId = 'print1';
    // create cookie with STAFF role
    // createSessionCookie only supports role option but returns cookie value
    const cookie = await createSessionCookie('STAFF' as any);
  const req = new Request(`http://localhost/api/print/batch/${batchId}/pdf`, { method: 'GET', headers: { cookie: `admin_session=${cookie}` } });
  const res = await printGet(req as any, { params: { id: batchId } }) as any;
  expect(res.status).toBe(403);
  });
});
