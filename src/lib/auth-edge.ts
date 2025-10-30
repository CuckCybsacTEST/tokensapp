/* Edge-safe auth helpers using Web Crypto only. This file avoids importing Node modules
 * so it can be safely used from Next.js middleware (Edge runtime).
 */

export type SessionRole = 'ADMIN' | 'STAFF' | 'COLLAB' | 'VIP' | 'MEMBER' | 'GUEST';

export interface SessionData {
  iat: number;
  exp: number;
  role?: SessionRole;
}

function base64urlEncode(bytes: Uint8Array) {
  // Web edge runtime should provide btoa
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return (globalThis as any).btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64urlDecodeToUint8Array(b64u: string): Uint8Array {
  const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  // Pad
  const pad = b64.length % 4;
  const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
  const binary = (globalThis as any).atob(padded);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return arr;
}

async function getSecretEdge(): Promise<Uint8Array | null> {
  if (!(globalThis as any).crypto?.subtle) return null;
  const base = (process.env.TOKEN_SECRET || 'dev_secret') + '|admin';
  const enc = new TextEncoder();
  const data = enc.encode(base);
  const hash = await (globalThis as any).crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}

async function hmacSha256Base64urlEdge(keyBytes: Uint8Array, message: string): Promise<string> {
  if (!(globalThis as any).crypto?.subtle) throw new Error('Web Crypto not available');
  const key = await (globalThis as any).crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf = await (globalThis as any).crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return base64urlEncode(new Uint8Array(sigBuf));
}

export function getSessionCookieFromRequest(req: Request): string | undefined {
  const cookie = req.headers.get('cookie') || '';
  const parts = cookie.split(/; */);
  for (const p of parts) {
    if (p.startsWith('admin_session=')) return p.substring('admin_session='.length);
  }
  return undefined;
}

export async function verifySessionCookieEdge(raw: string | undefined | null): Promise<SessionData | null> {
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const key = await getSecretEdge();
  if (!key) return null; // cannot verify without Web Crypto
  const expected = await hmacSha256Base64urlEdge(key, payload);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const json = new TextDecoder().decode(base64urlDecodeToUint8Array(payload));
    const data = JSON.parse(json) as SessionData;
    if (Date.now() > data.exp) return null;
    if (!data.role) data.role = 'ADMIN';
    return data;
  } catch {
    return null;
  }
}

export function hasAnyRole(session: SessionData | null, roles: SessionRole[]): boolean {
  if (!session) return false;
  return roles.includes(session.role || 'ADMIN');
}

export function requireRoleEdge(session: SessionData | null, roles: SessionRole[]): { ok: boolean; error?: string } {
  if (!session) return { ok: false, error: 'UNAUTHORIZED' };
  if (!hasAnyRole(session, roles)) return { ok: false, error: 'FORBIDDEN' };
  return { ok: true };
}
