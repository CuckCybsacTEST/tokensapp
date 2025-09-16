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
  await prisma.$executeRawUnsafe(`DELETE FROM Prize;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Batch;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Token;`);
  await prisma.$executeRawUnsafe(`INSERT INTO Batch (id, description) VALUES (?, 'test');`, batchId);
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  await prisma.$executeRawUnsafe(`INSERT INTO Prize (id,key,label,active,emittedTotal) VALUES (?,?,?,1,0);`, 'p1', 'p1', 'P1');
  for (let i = 0; i < count; i++) {
    const tokenId = `p1_tok${i}`;
    await prisma.$executeRawUnsafe(`INSERT INTO Token (id,prizeId,batchId,expiresAt,signature,signatureVersion,disabled) VALUES (?,?,?,?,?,?,0);`, tokenId, 'p1', batchId, expiresAt, 'sig', 1);
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
  try {
    await prisma.$executeRawUnsafe(`INSERT OR IGNORE INTO PrintTemplate (id,name,filePath,meta) VALUES (?,?,?,?);`, 'test-default', 'default', 'public/templates/default.png', JSON.stringify({ dpi: 300, cols: 2, rows: 4, qr: { xMm: 150, yMm: 230, widthMm: 30 } }));
  } catch (e) {
    // ignore
  }
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
