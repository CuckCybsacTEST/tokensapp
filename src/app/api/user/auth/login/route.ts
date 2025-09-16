import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/log";
import { createUserSessionCookie, buildSetUserCookie } from "@/lib/auth-user";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const { username, password } = body || {};

    if (!username || !password) {
      await logEvent("USER_AUTH_FAIL", "Login colaborador: credenciales incompletas", { ok: false });
      return new Response(JSON.stringify({ error: "INVALID_CREDENTIALS" }), { status: 401 });
    }

    // Use raw SQL to avoid Prisma Client type drift when schema recently changed
    const esc = (s: string) => s.replace(/'/g, "''");
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, username, passwordHash, role, personId FROM User WHERE username = '${esc(username)}' LIMIT 1`
    );
    const user = rows && rows[0];
    if (!user) {
      await logEvent("USER_AUTH_FAIL", "Login colaborador: usuario no encontrado", { username });
      return new Response(JSON.stringify({ error: "INVALID_CREDENTIALS" }), { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
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
