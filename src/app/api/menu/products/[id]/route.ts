import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Verificar si el producto tiene variantes asociadas
    const variantsCount = await prisma.productVariant.count({
      where: { productId: id },
    });

    if (variantsCount > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar el producto porque tiene variantes asociadas" },
        { status: 400 }
      );
    }

    // Eliminar el producto (eliminación lógica cambiando available a false)
    const product = await prisma.product.update({
      where: { id },
      data: { available: false },
    });

    return NextResponse.json({ message: "Producto eliminado exitosamente" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}