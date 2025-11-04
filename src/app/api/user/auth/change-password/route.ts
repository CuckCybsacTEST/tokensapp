import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/log";
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from "@/lib/auth-user";
import bcrypt from "bcryptjs";
import { apiError, apiOk } from '@/lib/apiError';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const raw = getUserSessionCookieFromRequest(req);
    const session = await verifyUserSessionCookie(raw);
    if (!session) {
      return apiError('UNAUTHORIZED', 'Sesión inválida', undefined, 401);
    }

    const body = await req.json().catch(() => ({} as any));
    const { currentPassword, newPassword } = body || {};

    if (!currentPassword || !newPassword) {
      return apiError('INVALID_INPUT', 'Contraseña actual y nueva son requeridas', undefined, 400);
    }

    if (newPassword.length < 8) {
      return apiError('INVALID_PASSWORD', 'La nueva contraseña debe tener al menos 8 caracteres', undefined, 400);
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, username: true, passwordHash: true, forcePasswordChange: true },
    });

    if (!user) {
      return apiError('USER_NOT_FOUND', 'Usuario no encontrado', undefined, 404);
    }

    // Verify current password
    let passwordValid = false;
    try {
      passwordValid = await bcrypt.compare(currentPassword, user.passwordHash || "");
    } catch (_err) {
      passwordValid = false;
    }

    if (!passwordValid) {
      return apiError('INVALID_CURRENT_PASSWORD', 'Contraseña actual incorrecta', undefined, 401);
    }

    // Hash new password
    const salt = bcrypt.genSaltSync(10);
    const newPasswordHash = bcrypt.hashSync(newPassword, salt);

    // Update password and clear forcePasswordChange flag
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        passwordHash: newPasswordHash,
        forcePasswordChange: false,
      },
    });

    await logEvent("USER_PASSWORD_CHANGE", "Usuario cambió su contraseña", { userId: session.userId, username: user.username });

    return apiOk({ ok: true, message: 'Contraseña cambiada exitosamente' });

  } catch (e: any) {
    await logEvent("USER_PASSWORD_CHANGE_ERROR", "Error cambiando contraseña", { message: String(e?.message || e) });
    return apiError('INTERNAL_ERROR', 'Error interno', undefined, 500);
  }
}