import { apiError } from "@/lib/apiError";
import { getSystemConfig } from "@/lib/config";
import { prisma } from "@/lib/prisma";

function unauthorized() {
  return apiError("UNAUTHORIZED", "Auth requerida", null, 401, {
    "WWW-Authenticate": 'Basic realm="health"',
  });
}

export async function GET(req: Request) {
  // Authorization: Bearer <token> OR Basic (user=health, pass=HEALTH_TOKEN)
  const header = req.headers.get("authorization") || "";
  const expected = process.env.HEALTH_TOKEN;
  if (!expected) {
    // If no token configured, deny to avoid accidental exposure
    return apiError("HEALTH_TOKEN_NOT_SET", "Endpoint deshabilitado", null, 503);
  }
  let ok = false;
  if (header.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    ok = token === expected;
  } else if (header.startsWith("Basic ")) {
    try {
      const raw = Buffer.from(header.slice(6), "base64").toString("utf8");
      const [user, pass] = raw.split(":");
      if (user === "health" && pass === expected) ok = true;
    } catch {
      ok = false;
    }
  }
  if (!ok) return unauthorized();
  const started = Date.now();
  try {
    // Simple queries
    const cfgPromise = getSystemConfig(true);
    const prizesCountPromise = prisma.prize.count();
    const tokensCountPromise = prisma.token.count();

    const [cfg, prizesCount, tokensCount] = await Promise.all([
      cfgPromise,
      prizesCountPromise,
      tokensCountPromise,
    ]);

    const ms = Date.now() - started;
    return new Response(
      JSON.stringify({
        ok: true,
        latencyMs: ms,
        system: {
          tokensEnabled: cfg.tokensEnabled,
          prizes: prizesCount,
          tokens: tokensCount,
        },
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
  }
}
