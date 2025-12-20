import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { apiError, apiOk } from '@/lib/apiError';
import { safeDeleteFile, deleteFromSupabase } from '@/lib/supabase-server';

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

    // Eliminar archivo de Supabase si tiene storageKey
    if (template.storageKey) {
      await deleteFromSupabase(template.storageKey);
    }

    // Eliminar archivo físico local (compatibilidad con sistema antiguo)
    if (template.filePath && template.filePath.startsWith('public/')) {
      const absolutePath = path.join(process.cwd(), template.filePath);
      await safeDeleteFile(absolutePath);
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
