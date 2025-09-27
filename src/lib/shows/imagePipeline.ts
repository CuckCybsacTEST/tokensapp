import { prisma } from '@/lib/prisma';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharpModule from 'sharp';

interface PipelineResult {
  reused: boolean;
  degraded: boolean; // si se redujo tamaño/resolución
  width: number;
  height: number;
  bytesOriginal: number;
  bytesOptimized: number;
  hash: string;
  originalPath: string;
  webpPath: string;
  blurData: string;
}

interface PipelineError extends Error { code: string; http?: number; details?: any }

function buildError(code: string, message?: string, http = 400, details?: any): PipelineError {
  const err = new Error(message || code) as PipelineError;
  err.code = code; err.http = http; err.details = details; return err;
}

const VALID_MIME = new Set(['image/jpeg','image/png','image/webp']);
const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_WIDTH = 1600;

function mimeFromBuffer(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
  if (buf.length >= 8 && buf.slice(0,8).toString('hex') === '89504e470d0a1a0a') return 'image/png';
  if (buf.length >= 12 && buf.slice(0,4).toString() === 'RIFF' && buf.slice(8,12).toString() === 'WEBP') return 'image/webp';
  return null;
}

async function ensureDir(dir: string) { await fs.mkdir(dir, { recursive: true }); }

async function computeHash(buf: Buffer): Promise<string> {
  // Cast as Uint8Array to satisfy BinaryLike under current TS lib definitions
  return createHash('sha256').update(new Uint8Array(buf)).digest('hex');
}

async function generateBlur(sharp: typeof sharpModule, buf: Buffer): Promise<string> {
  const tiny = await sharp(buf).resize(32, 32, { fit: 'inside', withoutEnlargement: true }).blur(10).toBuffer();
  const b64 = tiny.toString('base64');
  return `data:image/png;base64,${b64}`;
}

function pickStorageRoot(): string {
  // Reusar carpeta public/shows
  return path.join(process.cwd(), 'public', 'shows');
}

async function fileExists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

export async function processShowImage(showId: string, file: File | Blob, opts?: { actorRole?: string }): Promise<PipelineResult> {
  const started = Date.now();
  if (!file) throw buildError('NO_FILE', 'File required');
  const arrayBuf = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  const mime = mimeFromBuffer(buf);
  if (!mime || !VALID_MIME.has(mime)) throw buildError('UNSUPPORTED_FORMAT', 'Only jpeg/png/webp supported');
  if (buf.length > MAX_BYTES) throw buildError('FILE_TOO_LARGE', 'Max size 8MB');

  // Verificar show existe y no archivado
  const show = await prisma.show.findUnique({ where: { id: showId } });
  if (!show) throw buildError('NOT_FOUND', 'Show not found', 404);
  if (show.status === 'ARCHIVED') throw buildError('ARCHIVED_IMMUTABLE', 'Archived show cannot change image', 409);

  const hash = await computeHash(buf);
  // Buscar otro show con mismo hash (usando imageOriginalPath convencionado con hash) -> necesitamos convención.
  // Asumimos nombre de archivo original: hash + ext; almacenamos hash en imageOriginalPath para dedupe.

  const storageRoot = pickStorageRoot();
  await ensureDir(storageRoot);

  const ext = mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg';
  const baseName = `${hash}`; // hash SHA256 asegura unicidad contenido
  const originalFileName = `${baseName}${ext}`;
  const originalPath = path.join(storageRoot, originalFileName);
  // optimizedFileName se define tras conocer dimensiones reales
  let optimizedFileName = '';
  let webpPath = '';
  let reused = false;
  let width: number; let height: number; let optimizedBuf: Buffer; let degraded = false; let blurData: string;

  const sharp = sharpModule; // directo
  let meta = await sharp(buf).metadata();
  if (!meta.width || !meta.height) throw buildError('INVALID_IMAGE', 'Cannot read image dimensions');
  width = meta.width; height = meta.height;
  const dimToken = `${Math.min(9999, width)}x${Math.min(9999, height)}`;
  optimizedFileName = `${baseName}-${dimToken}.webp`;
  webpPath = path.join(storageRoot, optimizedFileName);

  // Redimensionar si excede ancho
  let working = buf;
  if (width > MAX_WIDTH) {
    working = await sharp(buf).resize({ width: MAX_WIDTH, withoutEnlargement: true }).toBuffer();
    const newMeta = await sharp(working).metadata();
    if (newMeta.width && newMeta.height) {
      degraded = true;
      width = newMeta.width; height = newMeta.height;
    }
  }

  // Generar WebP optimizado
  optimizedBuf = await sharp(working).webp({ quality: 82 }).toBuffer();
  const optimizedMeta = await sharp(optimizedBuf).metadata();
  if (optimizedMeta.width && optimizedMeta.height) {
    // Asegurar dimensiones consistentes (webp no debería cambiar mucho)
    width = optimizedMeta.width; height = optimizedMeta.height;
  }

  blurData = await generateBlur(sharp, working);

  // Reuse detection: si archivos ya existen y otro show ya usa ese hash (comparamos ruta) => reused=true
  const existingShowWithSameHash = await prisma.show.findFirst({ where: { imageOriginalPath: originalFileName } });
  if (existingShowWithSameHash) {
    reused = true;
  }

  const bytesOriginal = buf.length;
  const bytesOptimized = optimizedBuf.length;

  const newFiles: string[] = [];
  try {
    if (!reused) {
      if (!(await fileExists(originalPath))) {
  await fs.writeFile(originalPath, new Uint8Array(working)); newFiles.push(originalPath);
      }
      if (!(await fileExists(webpPath))) {
  await fs.writeFile(webpPath, new Uint8Array(optimizedBuf)); newFiles.push(webpPath);
      }
    }

    // Actualizar show (si reused sólo cambiamos meta si no tenía todavía algo válido o si es distinto hash)
    const updateData = {
      imageOriginalPath: originalFileName,
  imageWebpPath: optimizedFileName,
      imageBlurData: blurData,
      width,
      height,
      bytesOriginal,
      bytesOptimized,
    };

    await prisma.$transaction(async tx => {
      await tx.show.update({ where: { id: showId }, data: updateData });
    });

  const result = { reused, degraded, width, height, bytesOriginal, bytesOptimized, hash, originalPath: originalFileName, webpPath: optimizedFileName, blurData };
    try {
  const { logShowEvent } = await import('@/lib/shows/audit');
      logShowEvent('show.image.process', showId, {
        actorRole: opts?.actorRole,
        bytesOptimized,
        durationMs: Date.now() - started,
        contentHash: hash,
        reused,
        degraded,
      });
    } catch {}
    return result;
  } catch (e) {
    // Rollback de archivos recién creados
    await Promise.all(newFiles.map(f => fs.unlink(f).catch(()=>{})));
    throw e;
  }
}

export type { PipelineResult };
