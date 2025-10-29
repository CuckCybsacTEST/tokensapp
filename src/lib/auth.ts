/* global globalThis */
const COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8h

export type SessionRole = 'ADMIN' | 'STAFF';

export interface SessionData {
  iat: number; // issued at (ms)
  exp: number; // expiry (ms)
  role?: SessionRole; // optional for backwards compatibility (legacy cookies → ADMIN)
}

async function getSecret(): Promise<Uint8Array> {
  const base = (process.env.TOKEN_SECRET || "dev_secret") + "|admin";
  // Use Web Crypto when available (Edge runtime / Browser); otherwise fallback to Node crypto
  if ((globalThis as any).crypto?.subtle) {
    const enc = new TextEncoder();
    const data = enc.encode(base);
    const hash = await (globalThis as any).crypto.subtle.digest("SHA-256", data);
    return new Uint8Array(hash);
  } else {
    const nodeCrypto = await import("crypto");
    const hex = nodeCrypto.createHash("sha256").update(base).digest();
    return new Uint8Array(hex);
  }
}

async function hmacSha256Base64url(keyBytes: Uint8Array, message: string): Promise<string> {
  if ((globalThis as any).crypto?.subtle) {
    const key = await (globalThis as any).crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBuf = await (globalThis as any).crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(message)
    );
    const b64 = Buffer.from(new Uint8Array(sigBuf)).toString("base64");
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  } else {
    const nodeCrypto = await import("crypto");
    return nodeCrypto
      .createHmac("sha256", keyBytes as unknown as any)
      .update(message)
      .digest("base64url");
  }
}

export async function createSessionCookie(roleOrOptions: SessionRole | { role?: SessionRole; email?: string } = 'ADMIN'): Promise<string> {
  const now = Date.now();
  const role = typeof roleOrOptions === 'string' ? roleOrOptions : (roleOrOptions?.role || 'ADMIN');
  const data: SessionData = { iat: now, exp: now + SESSION_TTL_MS, role };
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const key = await getSecret();
  const sig = await hmacSha256Base64url(key, payload);
  return `${payload}.${sig}`;
}

export async function verifySessionCookie(
  raw: string | undefined | null
): Promise<SessionData | null> {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const key = await getSecret();
  const expected = await hmacSha256Base64url(key, payload);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionData;
    if (Date.now() > data.exp) return null;
  if (!data.role) data.role = 'ADMIN'; // upgrade legacy session without role
  return data;
  } catch {
    return null;
  }
}

export function buildSetCookie(cookie: string): string {
  // Secure flag left conditional for local http
  const secure = process.env.NODE_ENV === "production" ? "Secure; " : "";
  const httpOnly = process.env.NODE_ENV === "production" ? "HttpOnly; " : "";
  return `${COOKIE_NAME}=${cookie}; Path=/; ${httpOnly}SameSite=Lax; ${secure}Max-Age=${
    SESSION_TTL_MS / 1000
  }`;
}

export function buildClearCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "Secure; " : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=0`;
}

export function getSessionCookieFromRequest(req: Request): string | undefined {
  const cookie = req.headers.get("cookie") || "";
  const parts = cookie.split(/; */);
  for (const p of parts) {
    if (p.startsWith("admin_session=")) return p.substring("admin_session=".length);
  }
  return undefined;
}

// Role helpers
export function hasAnyRole(session: SessionData | null, roles: SessionRole[]): boolean {
  if (!session) return false;
  return roles.includes((session.role || 'ADMIN'));
}

export function requireRole(session: SessionData | null, roles: SessionRole[]): { ok: boolean; error?: string } {
  if (!session) return { ok: false, error: 'UNAUTHORIZED' };
  if (!hasAnyRole(session, roles)) return { ok: false, error: 'FORBIDDEN' };
  return { ok: true };
}
