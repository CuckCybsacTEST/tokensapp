import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
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

export async function DELETE(request: Request) {
  // Extraer el ID de la plantilla de la URL
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  
  if (!id) {
    return apiError('INVALID_ID','ID de plantilla no proporcionado',undefined,400);
  }

  try {
    // Buscar la plantilla en la base de datos
    const template = await prisma.printTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return apiError('NOT_FOUND','Plantilla no encontrada',undefined,404);
    }

    // Eliminar el archivo físico
    if (template.filePath) {
      const absolutePath = path.join(process.cwd(), template.filePath);
      await safeDeleteFile(absolutePath, 'Archivo físico');
    }

    // Eliminar el registro de la base de datos
    await prisma.printTemplate.delete({
      where: { id }
    });

    return apiOk({ success: true, message: "Plantilla eliminada correctamente" });
  } catch (error: any) {
    console.error("Error al eliminar plantilla:", error);
    return apiError('INTERNAL_ERROR','Error al eliminar plantilla',{ message: error.message },500);
  }
}
