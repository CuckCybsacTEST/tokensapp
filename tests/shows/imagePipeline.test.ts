import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createDraft } from '@/lib/shows/service';
import { processShowImage } from '@/lib/shows/imagePipeline';
import sharp from 'sharp';

// Util: limpiar shows y borrar archivos creados (simple: dejamos archivos; o podríamos aislar a temp dir)
async function resetShows() { await prisma.$executeRawUnsafe('DELETE FROM "Show";'); }

function jpegBuffer(): Buffer {
  // Mínimo JPEG válido (SOI + EOI) con un bloque trivial. Para sharp, mejor generamos mediante raw tiny png.
  // Simpler: generamos un PNG diminuto de 1x1 (8 bytes header + IHDR + IDAT + IEND prehecho).
  // Pero pipeline detecta MIME: implementa firma; para PNG necesitamos la firma real.
  return Buffer.from(
    '89504e470d0a1a0a' + // signature PNG
    '0000000d49484452' + // IHDR chunk
    '00000001' + // width 1
    '00000001' + // height 1
    '08' + // bit depth
    '02' + // color type truecolor
    '000000' + // compression, filter, interlace
    '90' + '7753' + // CRC (dummy? we use very small; might break) -> easier: use a known 1x1 png hex
    '', 'hex');
}

// En lugar de construir PNG manual que podría ser inválido, creamos dinámicamente con Buffer de webp pequeño.
async function webpBuffer(): Promise<Buffer> {
  // Generar dinámicamente una imagen 10x10 roja válida y convertir a webp
  const raw = Buffer.alloc(10 * 10 * 3, 0);
  for (let i = 0; i < raw.length; i += 3) { raw[i] = 255; raw[i+1] = 0; raw[i+2] = 0; }
  return await sharp(raw, { raw: { width: 10, height: 10, channels: 3 } }).webp({ quality: 90 }).toBuffer();
}

beforeAll(async () => { await prisma.$queryRaw`SELECT 1`; });
beforeEach(async () => { await resetShows(); });

describe('imagePipeline', () => {
  test('subida válida', async () => {
    const draft = await createDraft({ title: 'Img A', startsAt: new Date().toISOString() });
  const buf = await webpBuffer();
  const file = new File([new Uint8Array(buf)], 'a.webp', { type: 'image/webp' });
    const res = await processShowImage(draft.id, file);
    expect(res.reused).toBe(false);
    expect(res.width).toBeGreaterThan(0);
    expect(res.height).toBeGreaterThan(0);
    expect(res.bytesOriginal).toBeGreaterThan(0);
    expect(res.bytesOptimized).toBeGreaterThan(0);
    const updated = await prisma.show.findUnique({ where: { id: draft.id } });
    expect(updated?.imageWebpPath).toBe(res.webpPath);
  });

  test('reupload reused', async () => {
    const d1 = await createDraft({ title: 'Img1', startsAt: new Date().toISOString() });
    const d2 = await createDraft({ title: 'Img2', startsAt: new Date().toISOString() });
  const buf = await webpBuffer();
  const file1 = new File([new Uint8Array(buf)], 'r.webp', { type: 'image/webp' });
    const r1 = await processShowImage(d1.id, file1);
  const file2 = new File([new Uint8Array(buf)], 's.webp', { type: 'image/webp' });
    const r2 = await processShowImage(d2.id, file2);
    expect(r1.hash).toBe(r2.hash);
    expect(r2.reused).toBe(true); // segundo debe marcar reused
    // Ambos shows deben apuntar a mismo originalPath
    const s1 = await prisma.show.findUnique({ where: { id: d1.id } });
    const s2 = await prisma.show.findUnique({ where: { id: d2.id } });
    expect(s1?.imageOriginalPath).toBe(s2?.imageOriginalPath);
  });

  test('fallo MIME no permitido', async () => {
    const draft = await createDraft({ title: 'Bad Img', startsAt: new Date().toISOString() });
  const bad = new File([new TextEncoder().encode('hello world')], 'x.txt', { type: 'text/plain' });
    await expect(processShowImage(draft.id, bad)).rejects.toMatchObject({ code: 'UNSUPPORTED_FORMAT' });
  });
});
