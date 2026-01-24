import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Listar usuarios bloqueados
export async function GET() {
  try {
    const users = await prisma.musicBlockedUser.findMany({
      orderBy: { blockedAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      users,
    });
  } catch (error) {
    console.error("Error fetching blocked users:", error);
    return NextResponse.json(
      { ok: false, error: "Error al obtener usuarios bloqueados" },
      { status: 500 }
    );
  }
}

// POST - Bloquear un usuario
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, ipAddress, deviceFingerprint, reason, expiresAt, permanent, blockedBy } = body;

    if (!identifier || !reason) {
      return NextResponse.json(
        { ok: false, error: "Identificador y razón son requeridos" },
        { status: 400 }
      );
    }

    const blockedUser = await prisma.musicBlockedUser.create({
      data: {
        identifier,
        ipAddress,
        deviceFingerprint,
        reason,
        blockedBy: blockedBy || "Admin",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        permanent: permanent || false,
      },
    });

    return NextResponse.json({
      ok: true,
      user: blockedUser,
    });
  } catch (error) {
    console.error("Error blocking user:", error);
    return NextResponse.json(
      { ok: false, error: "Error al bloquear usuario" },
      { status: 500 }
    );
  }
}
