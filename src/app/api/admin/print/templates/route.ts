import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

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
      try {
        if (template.filePath) {
          const absolutePath = path.join(process.cwd(), template.filePath);
          await fs.unlink(absolutePath).catch(err => {
            console.error(`Error al eliminar archivo físico de plantilla ${template.id}:`, err);
          });
        }
      } catch (fileErr) {
        console.error(`Error al procesar eliminación de archivo para plantilla ${template.id}:`, fileErr);
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
    return new NextResponse(JSON.stringify(templates), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (err: any) {
    console.error('Error al obtener plantillas:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR', detail: err?.message || String(err) }, { status: 500 });
  }
}
