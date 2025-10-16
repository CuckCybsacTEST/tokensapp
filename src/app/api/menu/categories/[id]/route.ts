import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Verificar si la categoría tiene productos asociados (solo productos disponibles)
    const productsCount = await prisma.product.count({
      where: {
        categoryId: id,
        available: true,
      },
    });

    if (productsCount > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar la categoría porque tiene productos asociados" },
        { status: 400 }
      );
    }

    // Eliminar la categoría (eliminación lógica cambiando active a false)
    const category = await prisma.category.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ message: "Categoría eliminada exitosamente" });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}