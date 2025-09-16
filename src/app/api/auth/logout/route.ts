import { buildClearCookie } from "@/lib/auth";
import { logEvent } from "@/lib/log";

export async function POST() {
  await logEvent("AUTH_LOGOUT", "Logout admin", {});
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Set-Cookie": buildClearCookie() },
  });
}
