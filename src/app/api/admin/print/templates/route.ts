export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { apiError, apiOk } from '@/lib/apiError';

// Función helper para eliminar archivos de manera segura
async function safeDeleteFile(filePath: string, context: string = 'archivo') {
  try {
    if (existsSync(filePath)) {
      await fs.unlink(filePath);
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

export async function GET(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
  if (!session) return apiError('UNAUTHORIZED','UNAUTHORIZED',undefined,401);
    const roleCheck = requireRole(session, ['ADMIN']);
  if (!roleCheck.ok) return apiError('FORBIDDEN','FORBIDDEN',undefined,403);

    // Obtener solo las plantillas recientes (últimas 24 horas)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    // Encontrar plantillas antiguas para eliminar
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
    for (const template of oldTemplates) {
      if (template.filePath) {
        const absolutePath = path.join(process.cwd(), template.filePath);
        await safeDeleteFile(absolutePath, `Archivo físico de plantilla ${template.id}`);
      }
    }
    
    // Eliminar registros de plantillas antiguas de la base de datos
    await prisma.printTemplate.deleteMany({
      where: {
        createdAt: {
          lt: oneDayAgo
        }
      }
    });
    
    // Obtener plantillas recientes
    const templates = await prisma.printTemplate.findMany({
      where: {
        createdAt: {
          gte: oneDayAgo
        }
      },
      orderBy: { createdAt: 'desc' }, // Ordenar por más reciente primero
      select: {
        id: true,
        name: true,
        filePath: true,
        meta: true,
        createdAt: true
      }
    });

    // Responder con cabeceras anti-caché
    return apiOk(templates,200,{
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
  } catch (err: any) {
    console.error('Error al obtener plantillas:', err);
    return apiError('INTERNAL_ERROR','Error interno',{ message: err?.message || String(err) },500);
  }
}
