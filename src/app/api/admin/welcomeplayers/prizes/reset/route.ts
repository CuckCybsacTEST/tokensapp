import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/apiError";
import { getSessionCookieFromRequest, requireRole, verifySessionCookie } from "@/lib/auth";
import { listWelcomePlayersPrizes } from "@/lib/welcomeplayers/repository";
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
    await (prisma as any).welcomePlayersPrize.deleteMany({});
    const prizes = await listWelcomePlayersPrizes();
    return apiOk({ prizes, reset: true });
  } catch (error: any) {
    return apiError("WELCOMEPLAYERS_RESET_FAILED", error?.message || "No se pudo restaurar la base", undefined, 500);
  }
}
