import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/log";
import { createUserSessionCookie, buildSetUserCookie } from "@/lib/auth-user";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const { username, password, dni: dniRaw } = body || {};

    if ((!username && !dniRaw) || !password) {
      await logEvent("USER_AUTH_FAIL", "Login colaborador: credenciales incompletas", { ok: false });
      return new Response(JSON.stringify({ error: "INVALID_CREDENTIALS" }), { status: 401 });
    }

    const normDni = (s: string | undefined | null) => String(s || '').replace(/\D+/g, '');
    let user: { id: string; username: string; passwordHash: string; role: string; personId: string } | null = null;

    // 1) Intentar por username si está presente
    if (username) {
      const byUsername = await prisma.user.findUnique({
        where: { username },
        select: { id: true, username: true, passwordHash: true, role: true, personId: true },
      });
      if (byUsername) user = byUsername;
    }

    // 2) Si no se encontró por username, o no vino username, intentar por DNI (normalizado)
    if (!user) {
      const dniInput = normDni(dniRaw || username);
      if (dniInput) {
        const byDni = await prisma.user.findFirst({
          where: { person: { dni: dniInput } },
          select: { id: true, username: true, passwordHash: true, role: true, personId: true },
        });
        if (byDni) user = byDni;
      }
    }

    // Si no se encontró usuario
    if (!user) {
      await logEvent("USER_AUTH_FAIL", "Login colaborador: usuario no encontrado", { username: username || null, dni: normDni(dniRaw || username) || null });
      return new Response(JSON.stringify({ error: "INVALID_CREDENTIALS" }), { status: 401 });
    }

    let ok = false;
    try {
      ok = await bcrypt.compare(password, user.passwordHash || "");
    } catch (_err) {
      ok = false; // hash inválido o corrupto => credenciales inválidas
    }
    if (!ok) {
      await logEvent("USER_AUTH_FAIL", "Login colaborador: contraseña inválida", { username });
      return new Response(JSON.stringify({ error: "INVALID_CREDENTIALS" }), { status: 401 });
    }

    // Optional: if the linked person is inactive, you may block login.
    // const person = await prisma.person.findUnique({ where: { id: user.personId } });
    // if (person && !person.active) {
    //   return new Response(JSON.stringify({ error: "PERSON_INACTIVE" }), { status: 403 });
    // }

    const role = (user.role === "STAFF" ? "STAFF" : "COLLAB") as "STAFF" | "COLLAB";
    const token = await createUserSessionCookie(user.id, role);

    await logEvent("USER_AUTH_SUCCESS", "Login colaborador exitoso", { username, role });

    return new Response(
      JSON.stringify({ ok: true, role, userId: user.id, personId: user.personId }),
      { status: 200, headers: { "Set-Cookie": buildSetUserCookie(token) } }
    );
  } catch (e: any) {
    await logEvent("USER_AUTH_ERROR", "Login colaborador error", { message: String(e?.message || e) });
    return new Response(JSON.stringify({ error: "INTERNAL" }), { status: 500 });
  }
}
