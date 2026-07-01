import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/apiError";
import { getSessionCookieFromRequest, requireRole, verifySessionCookie } from "@/lib/auth";
import { createWelcomePlayersPrize, listWelcomePlayersPrizes } from "@/lib/welcomeplayers/repository";

export const dynamic = "force-dynamic";

async function requireAdmin(req: NextRequest) {
  const cookie = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(cookie);
  const auth = requireRole(session, ["ADMIN", "COORDINATOR"]);
  return auth.ok ? null : { code: auth.error || "UNAUTHORIZED", status: auth.error === "UNAUTHORIZED" ? 401 : 403 };
}

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return apiError(denied.code, denied.code, undefined, denied.status);
  const prizes = await listWelcomePlayersPrizes();
  return apiOk({ prizes });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return apiError(denied.code, denied.code, undefined, denied.status);

  try {
    const body = await req.json().catch(() => ({}));
    if (!body || typeof body.label !== "string" || !body.label.trim()) {
      return apiError("LABEL_REQUIRED", "Label requerido", undefined, 400);
    }
    const created = await createWelcomePlayersPrize({
      label: body.label,
      description: typeof body.description === "string" ? body.description : null,
      weight: typeof body.weight === "number" ? body.weight : body.weight != null ? Number(body.weight) : 1,
      status: typeof body.status === "string" ? body.status : "active",
    });
    return apiOk({ prize: created }, 201);
  } catch (error: any) {
    return apiError("PRIZE_CREATE_FAILED", error?.message || "No se pudo crear el premio", undefined, 500);
  }
}
