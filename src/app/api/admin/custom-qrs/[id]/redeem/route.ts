export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionCookieFromRequest, requireRole, verifySessionCookie } from "@/lib/auth";
import { apiError } from "@/lib/apiError";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { MUNDIAL2026_FANZONE_MAX_QR_PER_PARTICIPANT } from "@/lib/mundial2026/fanzone";

interface RouteParams {
  params: { id: string };
}

function parseCustomData(value: string | null) {
  if (!value) return {};
  try {
    return JSON.parse(value) as { maxUses?: number; usedCount?: number };
  } catch {
    return {};
  }
}

function parseMetadata(value: string | null) {
  if (!value) return {};
  try {
    return JSON.parse(value) as {
      redemptionHistory?: Array<{
        date: string;
        admin: string;
        usedCount: number;
        maxUses: number;
        exhausted: boolean;
      }>;
    };
  } catch {
    return {};
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError("UNAUTHORIZED", "UNAUTHORIZED", undefined, 401);
    const roleCheck = requireRole(session, ["ADMIN", "COORDINATOR", "STAFF", "COLLAB"]);
    if (!roleCheck.ok) return apiError("FORBIDDEN", "FORBIDDEN", undefined, 403);

    const qrId = params.id;
    const customQr = await (prisma as any).customQr.findUnique({
      where: { id: qrId },
      select: {
        id: true,
        code: true,
        customerName: true,
        redeemedAt: true,
        isActive: true,
        extendedCount: true,
        customData: true,
        metadata: true,
      },
    });

    if (!customQr) {
      return apiError("NOT_FOUND", "QR no encontrado", undefined, 404);
    }

    if (!customQr.isActive) {
      return apiError("INACTIVE", "Este QR está inactivo", undefined, 409);
    }

    const metadata = parseCustomData(customQr.customData);
    const currentAdminMetadata = parseMetadata(customQr.metadata);
    const maxUses = Math.min(
      MUNDIAL2026_FANZONE_MAX_QR_PER_PARTICIPANT,
      Math.max(1, Number(metadata.maxUses || metadata.usedCount || 1))
    );
    const usedCount = Math.min(maxUses, Math.max(0, Number(customQr.extendedCount || 0)));

    if (usedCount >= maxUses) {
      return apiError("ALREADY_REDEEMED", "Este QR ya completó sus usos", undefined, 409);
    }

    const now = new Date();
    const nextUsedCount = usedCount + 1;
    const exhausted = nextUsedCount >= maxUses;
    const redemptionHistory = Array.isArray(currentAdminMetadata.redemptionHistory)
      ? currentAdminMetadata.redemptionHistory
      : [];
    redemptionHistory.push({
      date: now.toISOString(),
      admin: session.userId,
      usedCount: nextUsedCount,
      maxUses,
      exhausted,
    });

    await (prisma as any).customQr.update({
      where: { id: qrId },
      data: {
        extendedCount: { increment: 1 },
        lastExtendedAt: now,
        redeemedAt: exhausted ? now : null,
        redeemedBy: exhausted ? session.userId : null,
        isActive: true,
        metadata: JSON.stringify({
          ...currentAdminMetadata,
          redemptionHistory,
        }),
      },
    });

    await audit("custom_qr_redeemed", session.userId, {
      qrCode: customQr.code,
      customerName: customQr.customerName,
      redeemedBy: session.userId,
      usedCount: nextUsedCount,
      maxUses,
      exhausted,
    });

    return NextResponse.json({
      ok: true,
      message: exhausted ? "QR redimido y agotado" : "Uso registrado correctamente",
      redeemedAt: exhausted ? now.toISOString() : null,
      redeemedBy: exhausted ? session.userId : null,
      usedCount: nextUsedCount,
      maxUses,
      exhausted,
    });
  } catch (error: any) {
    console.error("[API] Error redimiendo QR:", error);
    return apiError("INTERNAL_ERROR", "Error interno del servidor", undefined, 500);
  }
}
