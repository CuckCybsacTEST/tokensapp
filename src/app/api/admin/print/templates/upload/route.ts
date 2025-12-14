import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import path from 'path';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { apiError, apiOk } from '@/lib/apiError';

// Helper para sanitizar nombres de archivo
function sanitizeFileName(name: string): string {
  // Reemplazar espacios con guiones y quitar caracteres no permitidos
  return name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-');
}

// Función helper para eliminar archivos de manera segura
async function safeDeleteFile(filePath: string, context: string = 'archivo') {
  try {
    if (existsSync(filePath)) {
      await unlink(filePath);
      console.log(`${context} eliminado: ${filePath}`);
      return true;
    } else {
      console.log(`${context} no encontrado (ya eliminado): ${filePath}`);
      return false;
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log(`${context} no encontrado (ENOENT): ${filePath}`);
      return false;
    } else {
      console.error(`Error al eliminar ${context}:`, error);
      throw error; // Re-lanzar errores no relacionados con ENOENT
    }
  }
}

export async function POST(req: NextRequest) {
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

    // Preparar el directorio para guardar la plantilla
    const templatesDir = path.resolve(process.cwd(), 'public', 'templates');
    if (!existsSync(templatesDir)) {
      await mkdir(templatesDir, { recursive: true });
    }

    // Generar nombre de archivo único
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop() || 'png';
    const sanitizedName = sanitizeFileName(name);
    const fileName = `${sanitizedName}-${timestamp}.${fileExt}`;
    const filePath = path.join(templatesDir, fileName);
    const publicPath = `public/templates/${fileName}`;

    // Guardar el archivo
    const arrayBuffer = await file.arrayBuffer();
    console.log('Guardando archivo en:', filePath);
    console.log('Ruta pública:', publicPath);
    await writeFile(filePath, new Uint8Array(arrayBuffer));
    
    // Verificar que el archivo se guardó correctamente
    if (!existsSync(filePath)) {
      throw new Error(`No se pudo guardar el archivo en ${filePath}`);
    }

    console.log('Archivo guardado correctamente. Tamaño:', arrayBuffer.byteLength, 'bytes');

    // Limpiar plantillas antiguas
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
        filePath: true
      }
    });
    
    // Eliminar archivos físicos de plantillas antiguas
    for (const oldTemplate of oldTemplates) {
      if (oldTemplate.filePath) {
        const absolutePath = path.join(process.cwd(), oldTemplate.filePath);
        await safeDeleteFile(absolutePath, `Archivo antiguo de plantilla ${oldTemplate.id}`);
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
        filePath: publicPath,
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
    return apiError('INTERNAL_ERROR','Error interno',{ message: err?.message || String(err) },500);
  }
}
