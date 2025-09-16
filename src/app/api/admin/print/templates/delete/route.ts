import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

export async function DELETE(request: Request) {
  // Extraer el ID de la plantilla de la URL
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: "ID de plantilla no proporcionado" }, { status: 400 });
  }

  try {
    // Buscar la plantilla en la base de datos
    const template = await prisma.printTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }

    // Eliminar el archivo físico
    if (template.filePath) {
      try {
        const absolutePath = path.join(process.cwd(), template.filePath);
        await fs.unlink(absolutePath);
      } catch (fileError) {
        console.error("Error al eliminar el archivo físico:", fileError);
        // Continuamos con la eliminación en la base de datos aunque falle la eliminación del archivo
      }
    }

    // Eliminar el registro de la base de datos
    await prisma.printTemplate.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Plantilla eliminada correctamente" });
  } catch (error: any) {
    console.error("Error al eliminar plantilla:", error);
    return NextResponse.json({ error: `Error al eliminar plantilla: ${error.message}` }, { status: 500 });
  }
}
