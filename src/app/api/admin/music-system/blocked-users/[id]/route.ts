import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE - Desbloquear un usuario
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.musicBlockedUser.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      message: "Usuario desbloqueado",
    });
  } catch (error) {
    console.error("Error unblocking user:", error);
    return NextResponse.json(
      { ok: false, error: "Error al desbloquear usuario" },
      { status: 500 }
    );
  }
}
