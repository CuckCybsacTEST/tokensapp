import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from "@/lib/auth";
import { apiError, apiOk } from "@/lib/apiError";
import { redeemMundial2026Prediction, validateMundial2026Prediction } from "@/lib/mundial2026/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const raw = getUserSessionCookieFromRequest(req);
    const session = await verifyUserSessionCookie(raw);
    if (!session) {
      return apiError("UNAUTHORIZED", "Sesión inválida", {}, 401);
    }

    const json = (await req.json()) as {
      action?: string;
      scanInput?: string;
      device?: string;
      location?: string;
      notes?: string;
    };

    if (!json?.scanInput?.trim()) {
      return apiError("INVALID_BODY", "scanInput es requerido", {}, 400);
    }

    if (json.action === "redeem") {
      const result = await redeemMundial2026Prediction({
        scanInput: json.scanInput,
        userId: session.userId,
        device: json.device,
        location: json.location,
        notes: json.notes,
      });
      return apiOk(result);
    }

    const result = await validateMundial2026Prediction({
      scanInput: json.scanInput,
      userId: session.userId,
      device: json.device,
      location: json.location,
      notes: json.notes,
    });
    return apiOk(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo validar la jugada.";
    const status = message.includes("No se encontró") ? 404 : 400;
    return apiError("MUNDIAL2026_REDEEM_FAILED", message, {}, status);
  }
}