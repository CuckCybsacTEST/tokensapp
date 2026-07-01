import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/apiError";
import { getSessionCookieFromRequest, requireRole, verifySessionCookie } from "@/lib/auth";
import { deleteWelcomePlayersPrize, updateWelcomePlayersPrize } from "@/lib/welcomeplayers/repository";

export const dynamic = "force-dynamic";

async function requireAdmin(req: NextRequest) {
  const cookie = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(cookie);
  const auth = requireRole(session, ["ADMIN", "COORDINATOR"]);
  return auth.ok ? null : { code: auth.error || "UNAUTHORIZED", status: auth.error === "UNAUTHORIZED" ? 401 : 403 };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin(req);
  if (denied) return apiError(denied.code, denied.code, undefined, denied.status);

  try {
    const body = await req.json().catch(() => ({}));
    const updated = await updateWelcomePlayersPrize(params.id, {
      label: typeof body.label === "string" ? body.label : undefined,
      description: body.description === undefined ? undefined : typeof body.description === "string" ? body.description : null,
      weight: body.weight === undefined ? undefined : typeof body.weight === "number" ? body.weight : Number(body.weight),
      status: typeof body.status === "string" ? body.status : undefined,
    });
    return apiOk({ prize: updated });
  } catch (error: any) {
    return apiError("PRIZE_UPDATE_FAILED", error?.message || "No se pudo actualizar el premio", undefined, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requireAdmin(req);
  if (denied) return apiError(denied.code, denied.code, undefined, denied.status);

  try {
    await deleteWelcomePlayersPrize(params.id);
    return apiOk({ deleted: true });
  } catch (error: any) {
    return apiError("PRIZE_DELETE_FAILED", error?.message || "No se pudo eliminar el premio", undefined, 500);
  }
}
