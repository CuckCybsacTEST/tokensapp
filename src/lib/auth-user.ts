/* global globalThis */
// Auth de usuario (colaborador) con cookie separada: user_session

const COOKIE_NAME = "user_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

export type UserSessionRole = 'COLLAB' | 'STAFF';

export interface UserSessionData {
  iat: number; // issued at (ms)
  exp: number; // expiry (ms)
  userId: string;
  role: UserSessionRole; // default 'COLLAB'
}

// NOTA: Para evitar warnings en Edge Runtime, dividimos la obtención del secreto
// en dos caminos claros: uno 100% WebCrypto (edge) y uno Node (server). No mezclamos import dinámico "crypto" en edge.
async function getUserSecret(): Promise<Uint8Array> {
  const base = (process.env.TOKEN_SECRET || "dev_secret") + "|user";
  const g: any = globalThis as any;
  if (g.crypto?.subtle) {
    const enc = new TextEncoder();
    const data = enc.encode(base);
    const hash = await g.crypto.subtle.digest("SHA-256", data);
    return new Uint8Array(hash);
  }
  // Node fallback (no WebCrypto)
  const { createHash } = await import("crypto");
  const hex = createHash("sha256").update(base).digest();
  return new Uint8Array(hex);
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
  }
  // Node fallback HMAC
  const { createHmac } = await import("crypto");
  // Convertimos el keyBytes a string hex para usarlo como clave determinística
  const keyHex = Buffer.from(keyBytes).toString('hex');
  return createHmac("sha256", keyHex).update(message).digest("base64url");
}

export async function createUserSessionCookie(userId: string, role: UserSessionRole = 'COLLAB'): Promise<string> {
  const now = Date.now();
  const data: UserSessionData = { iat: now, exp: now + SESSION_TTL_MS, userId, role };
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const key = await getUserSecret();
  const sig = await hmacSha256Base64url(key, payload);
  return `${payload}.${sig}`;
}

export async function verifyUserSessionCookie(raw: string | undefined | null): Promise<UserSessionData | null> {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const key = await getUserSecret();
  const expected = await hmacSha256Base64url(key, payload);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as UserSessionData;
    if (Date.now() > data.exp) return null;
    if (!data.role) data.role = 'COLLAB';
    if (!data.userId) return null;
    return data;
  } catch {
    return null;
  }
}

export function buildSetUserCookie(cookie: string): string {
  const secure = process.env.NODE_ENV === "production" ? "Secure; " : "";
  return `${COOKIE_NAME}=${cookie}; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=${
    SESSION_TTL_MS / 1000
  }`;
}

export function buildClearUserCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "Secure; " : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=0`;
}

export function getUserSessionCookieFromRequest(req: Request): string | undefined {
  const cookie = req.headers.get("cookie") || "";
  const parts = cookie.split(/; */);
  for (const p of parts) {
    if (p.startsWith("user_session=")) return p.substring("user_session=".length);
  }
  return undefined;
}
