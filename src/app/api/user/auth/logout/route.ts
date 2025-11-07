import { buildClearUserCookie } from "@/lib/auth";
import { logEvent } from "@/lib/log";

export async function POST() {
  await logEvent("USER_AUTH_LOGOUT", "Logout colaborador", {});
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Set-Cookie": buildClearUserCookie() },
  });
}
