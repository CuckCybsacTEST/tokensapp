import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Eliminar la variante (eliminación lógica cambiando active a false)
    const variant = await prisma.productVariant.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ message: "Variante eliminada exitosamente" });
  } catch (error) {
    console.error("Error deleting variant:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}