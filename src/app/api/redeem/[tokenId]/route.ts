import { Prisma } from "@prisma/client";

import { apiError, apiOk } from "@/lib/apiError";
import { getSystemConfig } from "@/lib/config";
import { computeTokensEnabled } from "@/lib/tokensMode";
import { logEvent } from "@/lib/log";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { verifyTokenSignature, SECRET_MAP } from "@/lib/signing";

export async function POST(_req: Request, { params }: { params: { tokenId: string } }) {
  const { tokenId } = params;
  // Rate limiting per IP
  const ipHeader =
    _req.headers.get("x-forwarded-for") || _req.headers.get("x-real-ip") || "unknown";
  const ip = ipHeader.split(",")[0].trim();
  const rl = checkRateLimit(`redeem:${ip}`);
  if (!rl.ok) {
    return apiError(
      "RATE_LIMIT",
      "Demasiadas solicitudes de canje. Intenta más tarde.",
      { retryAfterSeconds: rl.retryAfterSeconds },
      429,
      { "Retry-After": rl.retryAfterSeconds.toString() }
    );
  }
  const cfg = await getSystemConfig();
  const tz = process.env.TOKENS_TIMEZONE || 'America/Lima';
  const scheduled = computeTokensEnabled({ now: new Date(), tz });
  if (!cfg.tokensEnabled) {
    await logEvent("REDEEM_BLOCKED", "Intento con sistema OFF", { tokenId });
    return apiError("SYSTEM_OFF", "Tokens deshabilitados temporalmente", { tokenId }, 423);
  }
  // Option B: si el sistema está ON (override manual), permitimos canje aunque no sea ventana horaria programada
  if (!scheduled.enabled) {
    await logEvent("REDEEM_OVERRIDE_WINDOW", "Redención fuera de ventana (override manual ON)", { tokenId, tz });
  }
  // Transacción: validación + update condicional para evitar doble redención
  try {
    const result = await prisma.$transaction(async (tx) => {
  const token = await tx.token.findUnique({ where: { id: tokenId }, include: { prize: true } });
      if (!token) {
        await logEvent("REDEEM_NOT_FOUND", "Token no encontrado", { tokenId }, tx as any);
        return {
          status: 404,
          body: { code: "NOT_FOUND", message: "Token no encontrado" },
        } as const;
      }
      if (token.disabled || !token.prize.active) {
        await logEvent(
          "REDEEM_INACTIVE",
          "Token o premio inactivo",
          { tokenId, prizeId: token.prizeId },
          tx as any
        );
        return {
          status: 410,
          body: { code: "INACTIVE", message: "Token/Premio inactivo" },
        } as const;
      }
      // Ventana horaria (validFrom): si existe y aún no se alcanza, bloquear
      const anyToken: any = token as any;
      if (anyToken.validFrom && Date.now() < new Date(anyToken.validFrom).getTime()) {
        await logEvent(
          'REDEEM_TOO_EARLY',
          'Intento de redención antes de validFrom',
          { tokenId, prizeId: token.prizeId, validFrom: anyToken.validFrom },
          tx as any
        );
        return { status: 409, body: { code: 'TOO_EARLY', message: 'Aún no disponible' } } as const;
      }
      if (Date.now() > token.expiresAt.getTime()) {
        await logEvent(
          "REDEEM_EXPIRED",
          "Token expirado",
          { tokenId, prizeId: token.prizeId },
          tx as any
        );
        return { status: 410, body: { code: "EXPIRED", message: "Expirado" } } as const;
      }

      // Verificación de firma
  const version = (token as any).signatureVersion || 1;
      const secret = SECRET_MAP[version];
      if (!secret) {
        await logEvent(
          'REDEEM_UNKNOWN_SIG_VERSION',
          'Versión firma desconocida',
          { tokenId, prizeId: token.prizeId, version },
          tx as any
        );
        return { status: 409, body: { code: 'UNKNOWN_SIGNATURE_VERSION', message: 'Versión de firma no soportada' } } as const;
      }
      const sigOk = verifyTokenSignature(
        secret,
        token.id,
        token.prizeId,
        token.expiresAt,
        token.signature,
        version
      );
      if (!sigOk) {
        await tx.token.update({ where: { id: token.id }, data: { disabled: true } });
        await logEvent(
          "REDEEM_BAD_SIGNATURE",
          "Firma inválida token; deshabilitado",
          { tokenId, prizeId: token.prizeId },
          tx as any
        );
        return { status: 409, body: { code: "BAD_SIGNATURE", message: "Firma inválida" } } as const;
      }

      // Intento atómico: solo actualiza si aún no tiene redeemedAt
      const now = new Date();
      const updated = await tx.token.updateMany({
        where: { id: tokenId, redeemedAt: null },
        data: { redeemedAt: now },
      });
      if (updated.count === 0) {
        await logEvent(
          "REDEEM_DUP",
          "Token ya redimido (race)",
          { tokenId, prizeId: token.prizeId },
          tx as any
        );
        return { status: 409, body: { code: "ALREADY_REDEEMED", message: "Ya redimido" } } as const;
      }
      return {
        status: 200,
        body: { ok: true, prize: token.prize, redeemedAt: now, signatureVersion: version },
      } as const;
    });
    if (result.status === 200) {
      await logEvent("REDEEM_OK", "Token redimido", { tokenId, signatureVersion: (result as any)?.body?.signatureVersion });
    }
    if (result.status === 200) return apiOk(result.body, 200);
    return apiError(result.body.code, result.body.message, { tokenId }, result.status);
  } catch (e: any) {
    await logEvent("REDEEM_ERROR", "Excepción en redeem", { tokenId, message: e?.message });
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return apiError("DB_ERROR", "Error de base de datos", { tokenId }, 500);
    }
    return apiError("TX_FAIL", "Fallo transaccional", { tokenId }, 500);
  }
}
