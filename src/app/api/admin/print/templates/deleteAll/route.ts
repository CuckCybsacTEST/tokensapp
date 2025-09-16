import { NextResponse } from "next/server";
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function DELETE(request: Request) {
  try {
    const raw = getSessionCookieFromRequest(request);
    const session = await verifySessionCookie(raw);
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    
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
    return new NextResponse(JSON.stringify({ success: true, message: "Todas las plantillas eliminadas correctamente", count: templates.length }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error("Error al eliminar todas las plantillas:", error);
    return NextResponse.json({ error: `Error al eliminar plantillas: ${error.message}` }, { status: 500 });
  }
}
