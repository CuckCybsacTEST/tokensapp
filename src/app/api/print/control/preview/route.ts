export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { composeTemplateWithQr } from '@/lib/print/compose';
import path from 'path';
import { prisma } from '@/lib/prisma';
import qrcode from 'qrcode';
import os from 'os';
import { writeFile, unlink } from 'fs/promises';
import { randomUUID } from 'crypto';
import { apiError } from '@/lib/apiError';
import { supabaseAdmin } from '@/lib/supabase';

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
    const templateId = url.searchParams.get('templateId');

    if (!templateId) {
      return apiError('MISSING_TEMPLATE_ID','Falta templateId',undefined,400);
    }

    // Cargar la plantilla desde la base de datos
    const template = await prisma.printTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return apiError('TEMPLATE_NOT_FOUND','Plantilla no encontrada',undefined,404);
    }

    console.log('Template encontrado:', template);

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
      if (template.filePath.startsWith('public/')) {
        templatePath = path.resolve(process.cwd(), template.filePath);
      } else {
        templatePath = path.resolve(process.cwd(), 'public/templates', template.filePath);
      }

      // Verificar que el archivo existe
      const fs = require('fs');
      if (!fs.existsSync(templatePath)) {
        console.error('El archivo de plantilla no existe en la ruta:', templatePath);
        return apiError('TEMPLATE_FILE_NOT_FOUND','Archivo de plantilla no encontrado',{ path: templatePath },404);
      }
    } else {
      return apiError('TEMPLATE_FILE_NOT_FOUND','No se encontró archivo de plantilla',undefined,404);
    }

    console.log('Ruta de plantilla a usar:', templatePath);
    
    let dpi = 300;
    let defaultQrMeta = { xMm: 150, yMm: 230, widthMm: 30, rotationDeg: 0 };

    // Obtener configuración de metadatos si existen
    if (template.meta) {
      try {
        const metaObj = JSON.parse(template.meta);
        if (metaObj.dpi) dpi = metaObj.dpi;
        if (metaObj.qr) defaultQrMeta = metaObj.qr;
      } catch (e) {
        console.warn('print template meta parse failed', e);
      }
    }

    // Crear un QR de ejemplo para la vista previa
    const exampleQrUrl = "https://ejemplo.com/qr-de-ejemplo";
    const qrBuffer = await qrcode.toBuffer(exampleQrUrl, {
      errorCorrectionLevel: 'M',
      width: 300,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    try {
      console.log('Intentando componer la plantilla con QR de ejemplo...');
      // Componer la plantilla con el QR de ejemplo
      const previewImage = await composeTemplateWithQr({
        templatePath,
        qrBuffer,
        qrMetadata: defaultQrMeta,
        dpi
      });

      console.log('Composición exitosa, tamaño de imagen:', previewImage.length, 'bytes');

      // Convertir el Buffer a Uint8Array para asegurar compatibilidad con NextResponse
      const uint8Array = new Uint8Array(previewImage);

      // Devolver la imagen compuesta
      return new NextResponse(uint8Array, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } catch (composeError) {
      console.error('Error al componer la plantilla con QR:', composeError);
      return apiError('COMPOSE_ERROR','Error componiendo plantilla con QR',{
        message: composeError instanceof Error ? composeError.message : String(composeError),
        templatePath,
        qr: defaultQrMeta,
        dpi
      },500);
    } finally {
      // Limpiar archivo temporal si se creó
      if (tempTemplatePath) {
        try {
          await unlink(tempTemplatePath);
        } catch (cleanupError) {
          console.warn('Error limpiando archivo temporal:', cleanupError);
        }
      }
    }

  } catch (err: any) {
    console.error('print preview error', err);

    // Limpiar archivo temporal si se creó
    if (tempTemplatePath) {
      try {
        await unlink(tempTemplatePath);
      } catch (cleanupError) {
        console.warn('Error limpiando archivo temporal:', cleanupError);
      }
    }

    return apiError('INTERNAL_ERROR','Error interno',{ message: err?.message || String(err) },500);
  }
}

// POST /api/print/control/preview
// Accepts multipart/form-data with a 'file' field (image) and optional 'meta' JSON string.
// Generates a composed preview (template + example QR) without persisting anything.
export async function POST(req: NextRequest) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
  if (!session) return apiError('UNAUTHORIZED','UNAUTHORIZED',undefined,401);
    const roleCheck = requireRole(session, ['ADMIN']);
  if (!roleCheck.ok) return apiError('FORBIDDEN','FORBIDDEN',undefined,403);

    // Parse multipart form
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const metaStr = (formData.get('meta') as string | null) ?? null;

    if (!file) {
      return apiError('MISSING_FILE','Archivo requerido',undefined,400);
    }
    if (!file.type?.startsWith('image/')) {
      return apiError('INVALID_FILE_TYPE','Tipo de archivo inválido', { type: file.type },400);
    }

    // Defaults; allow override via meta if provided
    let dpi = 300;
    let qrMeta = { xMm: 150, yMm: 230, widthMm: 30, rotationDeg: 0 } as {
      xMm: number; yMm: number; widthMm: number; rotationDeg?: number;
    };
    if (metaStr) {
      try {
        const parsed = JSON.parse(metaStr);
        if (parsed?.dpi) dpi = Number(parsed.dpi) || dpi;
        if (parsed?.qr) {
          qrMeta = { ...qrMeta, ...parsed.qr };
        }
      } catch (e) {
        // ignore malformed meta; keep defaults
      }
    }

    // Write the uploaded image to a temporary file so composeTemplateWithQr can read it
    const arrayBuffer = await file.arrayBuffer();
    const tmpDir = os.tmpdir();
    const ext = (file.name?.split('.')?.pop() || 'png').toLowerCase();
    const tmpPath = path.join(tmpDir, `preview-${randomUUID()}.${ext}`);
    await writeFile(tmpPath, new Uint8Array(arrayBuffer));

    // Generate example QR
    const exampleQrUrl = 'https://ejemplo.com/qr-de-ejemplo';
    const qrBuffer = await qrcode.toBuffer(exampleQrUrl, {
      errorCorrectionLevel: 'M',
      width: 300,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    try {
      const previewImage = await composeTemplateWithQr({
        templatePath: tmpPath,
        qrBuffer,
        qrMetadata: qrMeta,
        dpi,
      });

      const uint8Array = new Uint8Array(previewImage);
      return new NextResponse(uint8Array, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    } finally {
      // Best-effort cleanup
      try { await unlink(tmpPath); } catch {}
    }
  } catch (err: any) {
    console.error('print preview (upload) error', err);
    return apiError('INTERNAL_ERROR','Error interno',{ message: err?.message || String(err) },500);
  }
}
