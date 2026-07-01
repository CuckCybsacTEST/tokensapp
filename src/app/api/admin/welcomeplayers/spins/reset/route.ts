import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/apiError";
import { getSessionCookieFromRequest, requireRole, verifySessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireAdmin(req: NextRequest) {
  const cookie = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(cookie);
  const auth = requireRole(session, ["ADMIN", "COORDINATOR"]);
  return auth.ok ? null : { code: auth.error || "UNAUTHORIZED", status: auth.error === "UNAUTHORIZED" ? 401 : 403 };
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return apiError(denied.code, denied.code, undefined, denied.status);

  try {
    await (prisma as any).welcomePlayersSpin.deleteMany({});
    return apiOk({ reset: true, spins: [] });
  } catch (error: any) {
    return apiError("WELCOMEPLAYERS_RESET_SPINS_FAILED", error?.message || "No se pudo reiniciar el contador de giros", undefined, 500);
  }
}
