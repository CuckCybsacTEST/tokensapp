import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { generateQrPngDataUrl } from '@/lib/qr';
import composeTemplateWithQr from '@/lib/print/compose';
import assemblePages from '@/lib/print/layout';
import composePdfFromPagePngs from '@/lib/print/pdf';
import fs from 'fs';
import path from 'path';
import { audit } from '@/lib/audit';
import { apiError } from '@/lib/apiError';

// Optional: try to import Prisma client if present for fallback
// Do not require prisma at module load time; tests set global._prisma after import.
// We'll lazy-require it inside the handler so it picks up the test client.

// Helper to convert dataURL to Buffer
function dataUrlToBuffer(dataUrl: string): Buffer {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error('Invalid dataUrl');
  return Buffer.from(match[2], 'base64');
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
  const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
  if (!session) return apiError('UNAUTHORIZED','UNAUTHORIZED',undefined,401);
    const roleCheck = requireRole(session, ['ADMIN']);
  if (!roleCheck.ok) return apiError('FORBIDDEN','FORBIDDEN',undefined,403);

  const batchId = params.id;

  // Query params: allow caller to limit work per-request and tune chunking
  const url = new URL(req.url);
  // maxTokens: hard cap to avoid OOM (default 2000)
  const maxTokens = Math.min(Number(url.searchParams.get('maxTokens') || '2000'), 10000);
  // chunkSize: number of tokens processed per batch iteration (default 100)
  const chunkSize = Math.max(1, Number(url.searchParams.get('chunkSize') || '100'));

    // Attempt to find tokens.csv under temporary batch unzip folder used by existing code.
    // Known pattern in repo: some batch utilities create a folder under OS tmp with name `batch_<id>`
    // We'll try a few likely locations: ./tmp/batch_<id>/tokens.csv and ./tmp/<id>/tokens.csv
    const candidates = [
      path.resolve(process.cwd(), `tmp/batch_${batchId}/tokens.csv`),
      path.resolve(process.cwd(), `tmp/${batchId}/tokens.csv`),
      path.resolve(process.cwd(), `storage/batches/${batchId}/tokens.csv`),
    ];

    let tokensCsv: string | null = null;
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        tokensCsv = fs.readFileSync(p, 'utf8');
        break;
      }
    }

  // lazy-prisma: tests may set global._prisma; also try require if available
  let prisma: any = (global as any)._prisma ?? null;
  if (!prisma) {
    try { const p = require('@/lib/prisma'); prisma = p?.prisma ?? p?.default ?? p; } catch (e) { prisma = null; }
  }

  let tokens: { token_id: string; redeem_url: string }[] = [];
    if (tokensCsv) {
      // parse CSV header aware simple parser
      const lines = tokensCsv.split(/\r?\n/).filter(Boolean);
      const header = lines[0].split(',').map(h => h.trim());
      const idxToken = header.indexOf('token_id');
      const idxUrl = header.indexOf('redeem_url');
      if (idxToken === -1 || idxUrl === -1) {
        return apiError('INVALID_TOKENS_CSV','CSV de tokens inválido',undefined,500);
      }
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        tokens.push({ token_id: cols[idxToken], redeem_url: cols[idxUrl] });
      }
  } else if (prisma) {
      // fallback: attempt to load from DB by batch id (Prisma uses camelCase fields)
      try {
        const rows = await prisma.token.findMany({ where: { batchId }, select: { id: true } });
  tokens = rows.map((r: any) => ({ token_id: r.id, redeem_url: `https://example.com/r/${r.id}` }));
      } catch (e) {
        console.error('prisma token load failed', e);
      }
    }

    if (!tokens || tokens.length === 0) {
      return apiError('NOT_FOUND','No se encontraron tokens',undefined,404);
    }

    // Enforce the per-request limit to avoid processing an unbounded batch in one request.
    // If the batch is larger than maxTokens the endpoint will only process the first maxTokens
    // and return the partial PDF. Clients should page through the batch (pagination) or
    // request streamed processing for very large exports.
    const originalTokenCount = tokens.length;
    if (tokens.length > maxTokens) {
      tokens = tokens.slice(0, maxTokens);
    }

    // Template selection: allow caller to pass templateId=<id> which maps to PrintTemplate DB record
    const templateId = url.searchParams.get('templateId');
    let templatePath = path.resolve(process.cwd(), 'public', 'templates', 'default.png');
  // defaults: produce one template per row and 8 rows per A4 page (portrait)
  let dpi = 300;
  let cols = 1;
  let rows = 8;
    let defaultQrMeta: any = { xMm: 150, yMm: 230, widthMm: 30, rotationDeg: 0 };

  if (templateId && prisma) {
      try {
        const tpl = await prisma.printTemplate.findUnique({ where: { id: templateId } });
        if (tpl) {
          // filePath stored as public/...; resolve to FS path
          templatePath = path.resolve(process.cwd(), tpl.filePath.startsWith('public/') ? tpl.filePath : `public/templates/${tpl.filePath}`);
          if (tpl.meta) {
            try {
              const metaObj = JSON.parse(tpl.meta);
              if (metaObj.dpi) dpi = metaObj.dpi;
              if (metaObj.cols) cols = metaObj.cols;
              if (metaObj.rows) rows = metaObj.rows;
              if (metaObj.qr) defaultQrMeta = metaObj.qr;
            } catch (e) {
              console.warn('print template meta parse failed', e);
            }
          }
        }
      } catch (e) {
        console.error('failed to load print template', e);
      }
    }

    if (!fs.existsSync(templatePath)) {
      return apiError('TEMPLATE_MISSING','Plantilla no encontrada',{ path: templatePath },500);
    }

  // Process tokens in chunks to keep memory usage bounded.
    // Strategy: for each chunk
    //  - generate QR PNGs and composed token images for the chunk
    //  - assemble pages for that chunk
    //  - append chunk pages to a pages array
    //  - release per-token buffers before processing next chunk
    // This keeps the peak memory proportional to chunkSize * (image size) instead of
    // tokens.length * (image size). For very large batches, replace this with a true
    // streaming PDF writer that accepts incremental pages (see TODO below).
  const pages: Buffer[] = [];
  const startMs = Date.now();
    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunk = tokens.slice(i, i + chunkSize);
      const composedImages: Buffer[] = [];

      for (const t of chunk) {
        const dataUrl = await generateQrPngDataUrl(t.redeem_url);
        const qrBuf = dataUrlToBuffer(dataUrl);

        // Use template meta's qr defaults (position/size) unless overridden by query params
        const qrMeta = defaultQrMeta;

        const composed = await composeTemplateWithQr({ templatePath, qrBuffer: qrBuf, qrMetadata: qrMeta, dpi });
        composedImages.push(composed);
      }

      // Assemble pages for this chunk and append to global pages list
  const chunkPages = await assemblePages(composedImages, { dpi, cols, rows, marginMm: 5, spacingMm: 0.05 });
      pages.push(...chunkPages);

      // Release references to allow GC to reclaim memory
      for (let j = 0; j < composedImages.length; j++) {
        // overwrite buffer reference
        composedImages[j] = Buffer.alloc(0);
      }
    }

    // Compose final PDF from all accumulated pages. Note: this still creates one PDF
    // in memory. For very large exports you should stream pages directly into a
    // streaming PDF writer (e.g. PDFKit or incremental use of pdf-lib) to avoid
    // holding the final PDF in memory. See TODO below.
  const pdfBuf = await composePdfFromPagePngs(pages, { dpi });
  const durationMs = Date.now() - startMs;

    const filename = `batch-${batchId}.pdf`;
  // NextResponse expects a BodyInit (ArrayBuffer/Uint8Array) for binary bodies in this runtime.
  // Ensure the response body is an Uint8Array/ArrayBuffer to satisfy NextResponse typing
  // Use safe conversions to avoid TypeScript/SharedArrayBuffer issues across runtimes.
  const toUint8 = (b: any): Uint8Array => {
    if (!b) return new Uint8Array();
    if (b instanceof Uint8Array) return b as Uint8Array;
    if (ArrayBuffer.isView(b)) return new Uint8Array((b as any).buffer, (b as any).byteOffset || 0, (b as any).byteLength || 0);
    if (b instanceof ArrayBuffer) return new Uint8Array(b);
    // fallback: try to create a Buffer then Uint8Array
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Buf = require('buffer').Buffer;
      if (Buf.isBuffer(b)) return new Uint8Array(Buf.from(b));
    } catch (e) {
      // ignore
    }
    // last resort stringify
    return new Uint8Array(Buffer.from(String(b)));
  };

  const pdfUint8 = toUint8(pdfBuf as any);
  // Make a fresh ArrayBuffer copy to avoid SharedArrayBuffer / runtime typing differences
  const arrCopy = new ArrayBuffer(pdfUint8.byteLength);
  new Uint8Array(arrCopy).set(pdfUint8);
    // Inform client about original batch size vs returned tokens in this partial export
    const contentRangeHeader = `tokens ${tokens.length}/${originalTokenCount}`;
    const producedBytes = pdfUint8.byteLength;
    // Audit the successful PDF generation. Do not block response on audit failure.
    try {
      // Session shape does not include an explicit user id in this project by default.
      // Use a best-effort approach; leave undefined if not available.
      const adminId = undefined;
      // meta: include batch id, counts, timing and bytes
      await audit('print.batch.pdf', adminId as string | undefined, {
        batchId,
        tokensRequested: originalTokenCount,
        tokensProcessed: tokens.length,
        durationMs,
        bytes: producedBytes,
      });
    } catch (e) {
      // audit is best-effort
      console.error('audit(print.batch.pdf) failed', e);
    }
    // TODO: Replace in-memory PDF composition with a streaming PDF writer for very large
    // exports. Strategy:
    //  - create a streaming response (ReadableStream)
    //  - for each chunk: assemble pages, convert to PDF pages and enqueue into the stream
    //  - finalize the PDF and close the stream
    // This avoids building the whole PDF in memory and supports backpressure to the HTTP socket.
  // Return a plain ArrayBuffer (copied) to satisfy BodyInit typing in all runtimes
  return new NextResponse(arrCopy, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Tokens-Processed': String(tokens.length),
          'X-Tokens-Requested': String(originalTokenCount),
          'X-Chunk-Size': String(chunkSize),
          'X-Content-Range': contentRangeHeader,
      },
    });
  } catch (err: any) {
    console.error('print batch error', err);
    return apiError('INTERNAL_ERROR','Error interno',{ message: err?.message || String(err) },500);
  }
}

// No default export — Next.js App Router expects named exports for HTTP methods.
