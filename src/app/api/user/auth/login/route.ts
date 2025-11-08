import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server';
import { logEvent } from "@/lib/log";
import { createUserSessionCookie, buildSetUserCookie } from "@/lib/auth";
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
      ok = await bcrypt.compare(password, user.passwordHash);
    } catch (e) {
      await logEvent("USER_AUTH_FAIL", "Login colaborador: error bcrypt", { error: String(e), userId: user.id });
      return apiError('INTERNAL_ERROR', 'Error interno', undefined, 500);
    }

    if (!ok) {
      await logEvent("USER_AUTH_FAIL", "Login colaborador: contraseña incorrecta", { userId: user.id });
      return apiError('INVALID_CREDENTIALS', 'Credenciales inválidas', undefined, 401);
    }

    // Validar rol - ahora incluye ADMIN
    if (!['ADMIN', 'STAFF', 'COLLAB'].includes(user.role)) {
      await logEvent("USER_AUTH_FAIL", "Login colaborador: rol inválido", { userId: user.id, role: user.role });
      return apiError('INVALID_CREDENTIALS', 'Rol de usuario inválido', undefined, 401);
    }

    // Crear sesión
    const sessionCookie = await createUserSessionCookie(user.id, user.role as 'ADMIN' | 'STAFF' | 'COLLAB');

    await logEvent("USER_AUTH_SUCCESS", "Login colaborador exitoso", {
      userId: user.id,
      role: user.role,
      username: user.username
    });

    return apiOk({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        personId: user.personId,
        forcePasswordChange: user.forcePasswordChange || false,
      },
      message: 'Login exitoso'
    }, 200, { 'Set-Cookie': buildSetUserCookie(sessionCookie) });  } catch (error) {
    console.error('Error en login:', error);
    await logEvent("USER_AUTH_ERROR", "Error interno en login", { error: String(error) });
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}
