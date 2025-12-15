import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import path from 'path';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { apiError, apiOk } from '@/lib/apiError';
import { uploadFileToSupabase, safeDeleteFile, getTempFilePath, deleteFromSupabase } from '@/lib/supabase';

// Helper para sanitizar nombres de archivo
function sanitizeFileName(name: string): string {
  // Reemplazar espacios con guiones y quitar caracteres no permitidos
  return name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-');
}

export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
  if (!session) return apiError('UNAUTHORIZED','UNAUTHORIZED',undefined,401);
    const roleCheck = requireRole(session, ['ADMIN']);
  if (!roleCheck.ok) return apiError('FORBIDDEN','FORBIDDEN',undefined,403);

    // Procesamiento del formulario multipart
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;

    if (!file) {
      return apiError('FILE_REQUIRED','No se proporcionó ningún archivo',undefined,400);
    }

    if (!name) {
      return apiError('NAME_REQUIRED','No se proporcionó un nombre para la plantilla',undefined,400);
    }

    // Validar que es una imagen
    if (!file.type.startsWith('image/')) {
      return apiError('INVALID_IMAGE_TYPE','El archivo debe ser una imagen',{ type: file.type },400);
    }

    // Generar ID único para la plantilla
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileExt = file.name.split('.').pop() || 'png';
    const storageKey = `templates/${templateId}.${fileExt}`;

    // Crear archivo temporal
    tempFilePath = getTempFilePath('template', fileExt);
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(tempFilePath, new Uint8Array(arrayBuffer));

    console.log('Archivo temporal creado:', tempFilePath);

    // Subir a Supabase
    const { url, storageKey: finalStorageKey } = await uploadFileToSupabase(
      tempFilePath,
      storageKey
    );

    tempFilePath = null; // Ya se limpió

    console.log('Archivo subido a Supabase:', { url, storageKey: finalStorageKey });

    // Limpiar plantillas antiguas (más de 1 día)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Buscar plantillas antiguas
    const oldTemplates = await prisma.printTemplate.findMany({
      where: {
        createdAt: {
          lt: oneDayAgo
        }
      },
      select: {
        id: true,
        storageKey: true,
        filePath: true
      }
    });

    // Eliminar archivos de Supabase de plantillas antiguas
    for (const oldTemplate of oldTemplates) {
      if (oldTemplate.storageKey) {
        await deleteFromSupabase(oldTemplate.storageKey);
      }
      // También intentar eliminar archivo local si existe (compatibilidad)
      if (oldTemplate.filePath && oldTemplate.filePath.startsWith('public/')) {
        const absolutePath = path.join(process.cwd(), oldTemplate.filePath);
        await safeDeleteFile(absolutePath);
      }
    }

    // Eliminar registros antiguos
    await prisma.printTemplate.deleteMany({
      where: {
        createdAt: {
          lt: oneDayAgo
        }
      }
    });

    // Crear registro en la base de datos
    const template = await prisma.printTemplate.create({
      data: {
        name: name,
        filePath: `public/templates/${templateId}.${fileExt}`, // Legacy compatibility
        storageProvider: 'supabase',
        storageKey: finalStorageKey,
        storageUrl: url,
        meta: JSON.stringify({
          dpi: 300,
          cols: 1,
          rows: 8,
          qr: { xMm: 150, yMm: 230, widthMm: 30, rotationDeg: 0 }
        })
      }
    });

    console.log('Plantilla registrada en la base de datos:', template);

    return apiOk(template);
  } catch (err: any) {
    console.error('Error al subir la plantilla:', err);

    // Limpiar archivo temporal si existe
    if (tempFilePath) {
      await safeDeleteFile(tempFilePath);
    }

    return apiError('INTERNAL_ERROR','Error interno',{ message: err?.message || String(err) },500);
  }
}
