export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { generateQrPngDataUrl } from '@/lib/qr';
import { composeTemplateWithQr } from '@/lib/print/compose';
import assemblePages from '@/lib/print/layout';
import composePdfFromPagePngs from '@/lib/print/pdf';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { writeFile, unlink } from 'fs/promises';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getPublicBaseUrl } from '@/lib/config';
import { apiError } from '@/lib/apiError';
import { supabaseAdmin } from '@/lib/supabase';

// Helper to convert dataURL to Buffer
function dataUrlToBuffer(dataUrl: string): Buffer {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error('Invalid dataUrl');
  return Buffer.from(match[2], 'base64');
}

export async function GET(req: Request) {
  let tempTemplatePath: string | null = null;

  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
  if (!session) return apiError('UNAUTHORIZED','UNAUTHORIZED',undefined,401);
    const roleCheck = requireRole(session, ['ADMIN']);
  if (!roleCheck.ok) return apiError('FORBIDDEN','FORBIDDEN',undefined,403);

    // Obtener parámetros de la URL
    const url = new URL(req.url);
    const batchId = url.searchParams.get('batchId');
    const templateId = url.searchParams.get('templateId');
    
    if (!batchId) {
      return apiError('BATCH_ID_REQUIRED','Falta batchId',undefined,400);
    }

    if (!templateId) {
      return apiError('MISSING_TEMPLATE_ID','Falta templateId',undefined,400);
    }

    // maxTokens: hard cap to avoid OOM (default 2000)
    const maxTokens = Math.min(Number(url.searchParams.get('maxTokens') || '2000'), 10000);
    // chunkSize: número de tokens procesados por iteración (default 100)
    const chunkSize = Math.max(1, Number(url.searchParams.get('chunkSize') || '100'));

    // Cargar tokens desde la base de datos, excluyendo tokens reservados por bi-token (pareados por 'retry')
    const reservedRows = await (prisma as any).$queryRaw<Array<{ id: string }>>`
      SELECT tFunc.id as id
      FROM "Token" tRetry
      JOIN "Prize" pRetry ON pRetry.id = tRetry."prizeId"
      JOIN "Token" tFunc ON tFunc.id = tRetry."pairedNextTokenId"
      WHERE pRetry.key = 'retry' AND tFunc."batchId" = ${batchId}
    `;
  const reservedIdArr: string[] = Array.from(new Set((reservedRows || []).map((r: { id: string }) => r.id)));
    
    // Cargar información del lote para determinar si es estático
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { staticTargetUrl: true }
    });

    if (!batch) {
      return apiError('BATCH_NOT_FOUND','Lote no encontrado',undefined,404);
    }

    const tokens = await prisma.token.findMany({
      where: { batchId, id: { notIn: reservedIdArr } },
      select: { id: true }
    });

    if (!tokens || tokens.length === 0) {
      return apiError('NO_TOKENS_FOUND','No hay tokens para imprimir',undefined,404);
    }

    // Preparar los tokens en el formato esperado
    const baseUrl = getPublicBaseUrl(req.url);
    // Usar /static/ para lotes estáticos, /r/ para lotes de ruleta
    const urlPrefix = batch.staticTargetUrl !== null ? '/static/' : '/r/';
    let tokenData = tokens.map((t: { id: string }) => ({ 
      token_id: t.id, 
      redeem_url: `${baseUrl}${urlPrefix}${t.id}` 
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
      return apiError('TEMPLATE_NOT_FOUND','Plantilla no encontrada',undefined,404);
    }

    // Obtener la ruta del archivo de plantilla
    let templatePath: string;

    if (template.storageUrl) {
      // Descargar desde Supabase
      console.log('Descargando plantilla desde Supabase:', template.storageUrl);
      const response = await fetch(template.storageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download template from Supabase: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      tempTemplatePath = path.join(os.tmpdir(), `template-${randomUUID()}.png`);
      await writeFile(tempTemplatePath, new Uint8Array(arrayBuffer));
      templatePath = tempTemplatePath;
    } else if (template.filePath) {
      // Usar ruta local (compatibilidad)
      templatePath = path.resolve(process.cwd(), template.filePath.startsWith('public/') ? template.filePath : `public/templates/${template.filePath}`);

      // Verificar que el archivo existe
      if (!fs.existsSync(templatePath)) {
        console.error('El archivo de plantilla no existe en la ruta:', templatePath);
        return apiError('TEMPLATE_FILE_NOT_FOUND','Archivo de plantilla no encontrado',{ path: templatePath },404);
      }
    } else {
      return apiError('TEMPLATE_FILE_NOT_FOUND','No se encontró archivo de plantilla',undefined,404);
    }

    console.log('Ruta de plantilla a usar:', templatePath);
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
      // Archivo físicamente ausente: diferenciamos de TEMPLATE_NOT_FOUND (registro DB)
      return apiError('TEMPLATE_FILE_NOT_FOUND','Archivo de plantilla no encontrado',{ path: templatePath },404);
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

    // Limpiar archivo temporal si existe
    if (tempTemplatePath) {
      try {
        await unlink(tempTemplatePath);
      } catch (cleanupError) {
        console.warn('Error limpiando archivo temporal:', cleanupError);
      }
    }

    return apiError('INTERNAL_ERROR','Error interno',{ message: err?.message || String(err) },500);
  } finally {
    // Limpiar archivo temporal si existe
    if (tempTemplatePath) {
      try {
        await unlink(tempTemplatePath);
      } catch (cleanupError) {
        console.warn('Error limpiando archivo temporal:', cleanupError);
      }
    }
  }
}
