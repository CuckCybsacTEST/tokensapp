import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { generateQrPngDataUrl } from '@/lib/qr';
import { composeTemplateWithQr } from '@/lib/print/compose';
import assemblePages from '@/lib/print/layout';
import composePdfFromPagePngs from '@/lib/print/pdf';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';

// Helper to convert dataURL to Buffer
function dataUrlToBuffer(dataUrl: string): Buffer {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error('Invalid dataUrl');
  return Buffer.from(match[2], 'base64');
}

export async function GET(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    // Obtener parámetros de la URL
    const url = new URL(req.url);
    const batchId = url.searchParams.get('batchId');
    const templateId = url.searchParams.get('templateId');
    
    if (!batchId) {
      return NextResponse.json({ error: 'MISSING_BATCH_ID' }, { status: 400 });
    }

    if (!templateId) {
      return NextResponse.json({ error: 'MISSING_TEMPLATE_ID' }, { status: 400 });
    }

    // maxTokens: hard cap to avoid OOM (default 2000)
    const maxTokens = Math.min(Number(url.searchParams.get('maxTokens') || '2000'), 10000);
    // chunkSize: número de tokens procesados por iteración (default 100)
    const chunkSize = Math.max(1, Number(url.searchParams.get('chunkSize') || '100'));

    // Cargar tokens desde la base de datos
    const tokens = await prisma.token.findMany({
      where: { batchId },
      select: { id: true }
    });

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ error: 'NO_TOKENS_FOUND' }, { status: 404 });
    }

    // Preparar los tokens en el formato esperado
    let tokenData = tokens.map(t => ({ 
      token_id: t.id, 
      redeem_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com'}/redeem/${t.id}` 
    }));

    // Enforce the per-request limit to avoid processing an unbounded batch in one request.
    const originalTokenCount = tokenData.length;
    if (tokenData.length > maxTokens) {
      tokenData = tokenData.slice(0, maxTokens);
    }

    // Cargar la plantilla desde la base de datos
    const template = await prisma.printTemplate.findUnique({ 
      where: { id: templateId }
    });

    if (!template) {
      return NextResponse.json({ error: 'TEMPLATE_NOT_FOUND' }, { status: 404 });
    }

    // Configurar la ruta de la plantilla y metadatos
    let templatePath = path.resolve(process.cwd(), template.filePath.startsWith('public/') ? template.filePath : `public/templates/${template.filePath}`);
    let dpi = 300;
    let cols = 1;
    let rows = 8;
    let defaultQrMeta = { xMm: 150, yMm: 230, widthMm: 30, rotationDeg: 0 };

    // Obtener configuración de metadatos si existen
    if (template.meta) {
      try {
        const metaObj = JSON.parse(template.meta);
        if (metaObj.dpi) dpi = metaObj.dpi;
        if (metaObj.cols) cols = metaObj.cols;
        if (metaObj.rows) rows = metaObj.rows;
        if (metaObj.qr) defaultQrMeta = metaObj.qr;
      } catch (e) {
        console.warn('print template meta parse failed', e);
      }
    }

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'TEMPLATE_FILE_MISSING' }, { status: 500 });
    }

    // Procesar tokens en chunks para mantener el uso de memoria limitado
    const pages: Buffer[] = [];
    const startMs = Date.now();
    
    for (let i = 0; i < tokenData.length; i += chunkSize) {
      const chunk = tokenData.slice(i, i + chunkSize);
      const composedImages: Buffer[] = [];

      for (const t of chunk) {
        const dataUrl = await generateQrPngDataUrl(t.redeem_url);
        const qrBuf = dataUrlToBuffer(dataUrl);

        // Usar los metadatos de la plantilla para posición/tamaño del QR
        const qrMeta = defaultQrMeta;

        const composed = await composeTemplateWithQr({ 
          templatePath, 
          qrBuffer: qrBuf, 
          qrMetadata: qrMeta, 
          dpi 
        });
        composedImages.push(composed);
      }

      // Ensamblar páginas para este chunk y agregar a la lista global de páginas
      const chunkPages = await assemblePages(composedImages, { 
        dpi, 
        cols, 
        rows, 
        marginMm: 5, 
        spacingMm: 0.05 
      });
      pages.push(...chunkPages);

      // Liberar referencias para permitir que el GC recoja memoria
      for (let j = 0; j < composedImages.length; j++) {
        // sobrescribir referencia del buffer
        composedImages[j] = Buffer.alloc(0);
      }
    }

    // Componer el PDF final a partir de todas las páginas acumuladas
    const pdfBuf = await composePdfFromPagePngs(pages, { dpi });
    const durationMs = Date.now() - startMs;

    const filename = `batch-${batchId}-template-${templateId}.pdf`;
    
    // Convertir buffer a formato adecuado para NextResponse
    const toUint8 = (b: any): Uint8Array => {
      if (!b) return new Uint8Array();
      if (b instanceof Uint8Array) return b as Uint8Array;
      if (ArrayBuffer.isView(b)) return new Uint8Array((b as any).buffer, (b as any).byteOffset || 0, (b as any).byteLength || 0);
      if (b instanceof ArrayBuffer) return new Uint8Array(b);
      try {
        const Buf = require('buffer').Buffer;
        if (Buf.isBuffer(b)) return new Uint8Array(Buf.from(b));
      } catch (e) {
        // ignore
      }
      return new Uint8Array(Buffer.from(String(b)));
    };

    const pdfUint8 = toUint8(pdfBuf as any);
    // Crear una copia de ArrayBuffer para evitar problemas de SharedArrayBuffer / diferencias de tipos en runtime
    const arrCopy = new ArrayBuffer(pdfUint8.byteLength);
    new Uint8Array(arrCopy).set(pdfUint8);
    
    // Informar al cliente sobre el tamaño original del lote vs tokens devueltos en esta exportación parcial
    const contentRangeHeader = `tokens ${tokenData.length}/${originalTokenCount}`;
    const producedBytes = pdfUint8.byteLength;
    
    // Registrar la generación exitosa del PDF en el sistema de auditoría
    try {
      const adminId = undefined; // Usar session.user?.id si está disponible
      await audit('print.control.pdf', adminId as string | undefined, {
        batchId,
        templateId,
        tokensRequested: originalTokenCount,
        tokensProcessed: tokenData.length,
        durationMs,
        bytes: producedBytes,
      });
    } catch (e) {
      // La auditoría es best-effort
      console.error('audit(print.control.pdf) failed', e);
    }
    
    // Retornar el PDF como respuesta
    return new NextResponse(arrCopy, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Tokens-Processed': String(tokenData.length),
        'X-Tokens-Requested': String(originalTokenCount),
        'X-Chunk-Size': String(chunkSize),
        'X-Content-Range': contentRangeHeader,
      },
    });
  } catch (err: any) {
    console.error('print control error', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR', detail: err?.message || String(err) }, { status: 500 });
  }
}
