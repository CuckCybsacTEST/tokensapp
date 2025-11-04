import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/log";
import { createUserSessionCookie, buildSetUserCookie } from "@/lib/auth-user";
import bcrypt from "bcryptjs";
import { apiError, apiOk } from '@/lib/apiError';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const { username, password, dni: dniRaw } = body || {};

    if ((!username && !dniRaw) || !password) {
      await logEvent("USER_AUTH_FAIL", "Login colaborador: credenciales incompletas", { ok: false });
      return apiError('INVALID_CREDENTIALS', 'Credenciales incompletas', undefined, 401);
    }

    const normDni = (s: string | undefined | null) => String(s || '').replace(/\D+/g, '');
    let user: { id: string; username: string; passwordHash: string; role: string; personId: string; forcePasswordChange?: boolean } | null = null;

    // 1) Intentar por username si está presente
    if (username) {
      const byUsername = await prisma.user.findUnique({
        where: { username },
        select: { id: true, username: true, passwordHash: true, role: true, personId: true, forcePasswordChange: true },
      });
      if (byUsername) user = byUsername;
    }

    // 2) Si no se encontró por username, o no vino username, intentar por DNI (normalizado)
    if (!user) {
      const dniInput = normDni(dniRaw || username);
      if (dniInput) {
        const byDni = await prisma.user.findFirst({
          where: { person: { dni: dniInput } },
          select: { id: true, username: true, passwordHash: true, role: true, personId: true, forcePasswordChange: true },
        });
        if (byDni) user = byDni;
      }
    }

    // Si no se encontró usuario
    if (!user) {
      await logEvent("USER_AUTH_FAIL", "Login colaborador: usuario no encontrado", { username: username || null, dni: normDni(dniRaw || username) || null });
      return apiError('INVALID_CREDENTIALS', 'Credenciales inválidas', undefined, 401);
    }

    let ok = false;
    try {
      ok = await bcrypt.compare(password, user.passwordHash || "");
    } catch (_err) {
      ok = false; // hash inválido o corrupto => credenciales inválidas
    }
    if (!ok) {
      await logEvent("USER_AUTH_FAIL", "Login colaborador: contraseña inválida", { username });
      return apiError('INVALID_CREDENTIALS', 'Credenciales inválidas', undefined, 401);
    }

  // Optional check persona inactiva podría devolver apiError('PERSON_INACTIVE', ...) si se habilita en el futuro.

    const role = (user.role === "STAFF" ? "STAFF" : "COLLAB") as "STAFF" | "COLLAB";
    const token = await createUserSessionCookie(user.id, role);

    await logEvent("USER_AUTH_SUCCESS", "Login colaborador exitoso", { username, role });

    return apiOk({ 
      ok: true, 
      role, 
      userId: user.id, 
      personId: user.personId,
      forcePasswordChange: user.forcePasswordChange || false
    }, 200, { 'Set-Cookie': buildSetUserCookie(token) });
  } catch (e: any) {
    await logEvent("USER_AUTH_ERROR", "Login colaborador error", { message: String(e?.message || e) });
    return apiError('INTERNAL_ERROR', 'Error interno', undefined, 500);
  }
}
