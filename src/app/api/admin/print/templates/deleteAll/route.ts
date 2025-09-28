export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { apiError, apiOk } from '@/lib/apiError';

export async function DELETE(request: Request) {
  try {
    const raw = getSessionCookieFromRequest(request);
    const session = await verifySessionCookie(raw);
  if (!session) return apiError('UNAUTHORIZED','UNAUTHORIZED',undefined,401);
    const roleCheck = requireRole(session, ['ADMIN']);
  if (!roleCheck.ok) return apiError('FORBIDDEN','FORBIDDEN',undefined,403);
    
    // Buscar todas las plantillas
    const templates = await prisma.printTemplate.findMany({
      select: {
        id: true,
        filePath: true
      }
    });

    // Eliminar archivos físicos
    for (const template of templates) {
      try {
        if (template.filePath) {
          const absolutePath = path.join(process.cwd(), template.filePath);
          if (existsSync(absolutePath)) {
            await fs.unlink(absolutePath);
            console.log(`Archivo eliminado: ${absolutePath}`);
          }
        }
      } catch (fileError: any) {
        console.error(`Error al eliminar el archivo físico de plantilla ${template.id}:`, fileError?.message || String(fileError));
        // Continuamos con la eliminación en la base de datos aunque falle la eliminación del archivo
      }
    }

    // Eliminar todos los registros de la base de datos
    await prisma.printTemplate.deleteMany({});

    // Responder con cabeceras anti-caché
    return apiOk({ success: true, message: "Todas las plantillas eliminadas correctamente", count: templates.length },200,{
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
  } catch (error: any) {
    console.error("Error al eliminar todas las plantillas:", error);
    return apiError('INTERNAL_ERROR', 'Error al eliminar plantillas', { message: error.message }, 500);
  }
}
