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
const MAX_WIDTH = 1200; // Más pequeño que shows ya que son ofertas

function mimeFromBuffer(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
  if (buf.length >= 8 && buf.slice(0,8).toString('hex') === '89504e470d0a1a0a') return 'image/png';
  if (buf.length >= 12 && buf.slice(0,4).toString() === 'RIFF' && buf.slice(8,12).toString() === 'WEBP') return 'image/webp';
  return null;
}

async function ensureDir(dir: string) { await fs.mkdir(dir, { recursive: true }); }

async function computeHash(buf: Buffer): Promise<string> {
  return createHash('sha256').update(new Uint8Array(buf)).digest('hex');
}

async function generateBlur(sharp: typeof sharpModule, buf: Buffer): Promise<string> {
  const tiny = await sharp(buf).resize(32, 32, { fit: 'inside', withoutEnlargement: true }).blur(10).toBuffer();
  const b64 = tiny.toString('base64');
  return `data:image/png;base64,${b64}`;
}

export async function processOfferImage(offerId: string, file: File): Promise<PipelineResult> {
  // Validate offer exists
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    select: { id: true, imagePath: true }
  });

  if (!offer) {
    throw buildError('NOT_FOUND', 'Offer not found', 404);
  }

  // Convert file to buffer
  const buf = Buffer.from(await file.arrayBuffer());
  const bytesOriginal = buf.length;

  // Validate size
  if (bytesOriginal > MAX_BYTES) {
    throw buildError('FILE_TOO_LARGE', `File too large: ${bytesOriginal} bytes (max ${MAX_BYTES})`, 400);
  }

  // Validate MIME type
  const mime = mimeFromBuffer(buf);
  if (!mime || !VALID_MIME.has(mime)) {
    throw buildError('INVALID_MIME', `Invalid file type: ${file.type || 'unknown'}`, 400);
  }

  // Compute hash
  const hash = await computeHash(buf);

  // Check if we already have this exact image
  const existing = await prisma.offer.findFirst({
    where: {
      OR: [
        { imagePath: { endsWith: `-${hash}.webp` } },
        { imageWebpPath: { endsWith: `-${hash}.webp` } }
      ]
    },
    select: { id: true, imagePath: true, imageWebpPath: true, width: true, height: true, imageBlurData: true }
  });

  if (existing) {
    // Reuse existing processed image
    await prisma.offer.update({
      where: { id: offerId },
      data: {
        imagePath: existing.imagePath,
        imageWebpPath: existing.imageWebpPath,
        width: existing.width,
        height: existing.height,
        imageBlurData: existing.imageBlurData
      }
    });

    return {
      reused: true,
      degraded: false,
      width: existing.width,
      height: existing.height,
      hash,
      originalPath: existing.imagePath,
      webpPath: existing.imageWebpPath,
      blurData: existing.imageBlurData
    };
  }

  // Process new image
  const sharp = sharpModule(buf);
  const metadata = await sharp.metadata();

  let degraded = false;
  let width = metadata.width!;
  let height = metadata.height!;

  // Resize if too large
  if (width > MAX_WIDTH) {
    const newHeight = Math.round((height * MAX_WIDTH) / width);
    sharp.resize(MAX_WIDTH, newHeight, { fit: 'inside', withoutEnlargement: true });
    width = MAX_WIDTH;
    height = newHeight;
    degraded = true;
  }

  // Generate WebP
  const webpBuf = await sharp.webp({ quality: 85 }).toBuffer();
  const bytesOptimized = webpBuf.length;

  // Generate blur data
  const blurData = await generateBlur(sharpModule, buf);

  // Save files
  const publicDir = path.join(process.cwd(), 'public');
  const offersDir = path.join(publicDir, 'offers');
  await ensureDir(offersDir);

  const originalFilename = `${offerId}-original-${hash}${path.extname(file.name) || '.jpg'}`;
  const webpFilename = `${offerId}-${hash}.webp`;

  const originalPath = path.join(offersDir, originalFilename);
  const webpPath = path.join(offersDir, webpFilename);

  // Save original and WebP
  await fs.writeFile(originalPath, new Uint8Array(buf));
  await fs.writeFile(webpPath, new Uint8Array(webpBuf));

  // Update database
  const publicOriginalPath = `/offers/${originalFilename}`;
  const publicWebpPath = `/offers/${webpFilename}`;

  await prisma.offer.update({
    where: { id: offerId },
    data: {
      imagePath: publicOriginalPath,
      imageWebpPath: publicWebpPath,
      width,
      height,
      imageBlurData: blurData
    }
  });

  return {
    reused: false,
    degraded,
    width,
    height,
    hash,
    originalPath: publicOriginalPath,
    webpPath: publicWebpPath,
    blurData
  };
}
