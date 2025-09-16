export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { composeTemplateWithQr } from '@/lib/print/compose';
import path from 'path';
import { prisma } from '@/lib/prisma';
import qrcode from 'qrcode';

export async function GET(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    // Obtener parámetros de la URL
    const url = new URL(req.url);
    const templateId = url.searchParams.get('templateId');
    
    if (!templateId) {
      return NextResponse.json({ error: 'MISSING_TEMPLATE_ID' }, { status: 400 });
    }

    // Cargar la plantilla desde la base de datos
    const template = await prisma.printTemplate.findUnique({ 
      where: { id: templateId }
    });

    if (!template) {
      return NextResponse.json({ error: 'TEMPLATE_NOT_FOUND' }, { status: 404 });
    }

    // Configurar la ruta de la plantilla y metadatos
    console.log('Template encontrado:', template);
    console.log('Ruta almacenada en la BD:', template.filePath);
    
    // Normalizar la ruta de la plantilla
    let templatePath;
    if (template.filePath.startsWith('public/')) {
      templatePath = path.resolve(process.cwd(), template.filePath);
    } else {
      templatePath = path.resolve(process.cwd(), 'public/templates', template.filePath);
    }
    
    console.log('Ruta normalizada para la plantilla:', templatePath);
    
    // Verificar que el archivo existe
    const fs = require('fs');
    if (!fs.existsSync(templatePath)) {
      console.error('El archivo de plantilla no existe en la ruta:', templatePath);
      return NextResponse.json({ error: `TEMPLATE_FILE_NOT_FOUND: ${templatePath}` }, { status: 404 });
    }
    
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
      return NextResponse.json(
        { 
          error: 'COMPOSE_ERROR', 
          detail: composeError instanceof Error ? composeError.message : String(composeError),
          templatePath,
          meta: {
            qr: defaultQrMeta,
            dpi
          }
        }, 
        { status: 500 }
      );
    }

  } catch (err: any) {
    console.error('print preview error', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR', detail: err?.message || String(err) }, { status: 500 });
  }
}
