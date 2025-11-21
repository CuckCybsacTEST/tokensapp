/* global globalThis */
// Auth de usuario (colaborador / staff / admin) con cookie separada: user_session

const COOKIE_NAME = "user_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

// Tipo común para roles de usuario
export type UserRole = 'COLLAB' | 'STAFF' | 'ADMIN';

export interface UserSessionData {
  iat: number; // issued at (ms)
  exp: number; // expiry (ms)
  userId: string;
  role: UserRole; // default 'COLLAB'
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
    return base64urlEncode(new Uint8Array(sigBuf));
  }
  // Node fallback HMAC
  const { createHmac } = await import("crypto");
  // Convertimos el keyBytes a string hex para usarlo como clave determinística
  const keyHex = Buffer.from(keyBytes).toString('hex');
  return createHmac("sha256", keyHex).update(message).digest("base64url");
}

function base64urlEncode(bytes: Uint8Array): string {
  // Edge-safe: usa btoa
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = (globalThis as any).btoa ? (globalThis as any).btoa(binary) : Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64urlDecodeToString(b64u: string): string {
  const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
  if ((globalThis as any).atob) {
    const binary = (globalThis as any).atob(padded);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(arr);
  }
  return Buffer.from(padded, 'base64').toString('utf8');
}

export async function createUserSessionCookie(userId: string, role: UserRole = 'COLLAB'): Promise<string> {
  console.log('DEBUG createUserSessionCookie: received role:', role, 'type:', typeof role);
  const now = Date.now();
  const data: UserSessionData = { iat: now, exp: now + SESSION_TTL_MS, userId, role };
  const payload = (() => {
    const json = JSON.stringify(data);
    if (typeof Buffer !== 'undefined') {
      try { return Buffer.from(json).toString('base64url'); } catch {}
    }
    // Edge-safe path
    return base64urlEncode(new TextEncoder().encode(json));
  })();
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
    const json = base64urlDecodeToString(payload);
    const data = JSON.parse(json) as UserSessionData;
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

// -------------------------------------------------------------
//  Compatibilidad Legacy
// -------------------------------------------------------------
// Muchos endpoints antiguos importaban funciones con nombres
// getSessionCookieFromRequest / verifySessionCookie / requireRole
// para sesiones admin. Proveemos alias para minimizar diffs.

export function getSessionCookieFromRequest(req: Request) {
  return getUserSessionCookieFromRequest(req);
}

export async function verifySessionCookie(raw: string | undefined | null) {
  return verifyUserSessionCookie(raw);
}

export function requireRole(session: UserSessionData | null | undefined, roles: string[]): { ok: boolean; hasAccess: boolean; error?: string } {
  if (!session) return { ok: false, hasAccess: false, error: 'NO_SESSION' };
  if (!roles.includes(session.role)) return { ok: false, hasAccess: false, error: 'FORBIDDEN' };
  return { ok: true, hasAccess: true };
}

// Helper para saber si un rol es administrativo
export function isAdminLike(role: UserRole | null | undefined) {
  return role === 'ADMIN' || role === 'STAFF';
}

// Helpers simplificados para refactors en rutas
export function hasRole(session: UserSessionData | null | undefined, roles: ReadonlyArray<UserRole>): boolean {
  return !!session && roles.includes(session.role);
}

export function isStaffOrAdmin(session: UserSessionData | null | undefined): boolean {
  return !!session && (session.role === 'STAFF' || session.role === 'ADMIN');
}

// Legacy helper solicitado por algunos endpoints antiguos.
export async function verifyStaffAccess(req: Request): Promise<{ ok: boolean; hasAccess: boolean; role?: UserRole; error?: string }> {
  const raw = getUserSessionCookieFromRequest(req);
  const session = await verifyUserSessionCookie(raw);
  if (session && (session.role === 'ADMIN' || session.role === 'STAFF')) {
    return { ok: true, hasAccess: true, role: session.role };
  }
  return { ok: false, hasAccess: false, error: 'FORBIDDEN' };
}
