/* Edge-safe user auth helpers using Web Crypto only for Next.js middleware */

import type { UserRole } from './auth';

export interface UserSessionData {
  iat: number;
  exp: number;
  userId: string;
  role: UserRole;
}

function base64urlEncode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return (globalThis as any).btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64urlDecodeToUint8Array(b64u: string): Uint8Array {
  const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
  const binary = (globalThis as any).atob(padded);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return arr;
}

async function getUserSecretEdge(): Promise<Uint8Array | null> {
  if (!(globalThis as any).crypto?.subtle) return null;
  const base = (process.env.TOKEN_SECRET || 'dev_secret') + '|user';
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

export function getUserSessionCookieFromRequest(req: Request): string | undefined {
  const cookie = req.headers.get('cookie') || '';
  const parts = cookie.split(/; */);
  for (const p of parts) {
    if (p.startsWith('user_session=')) return p.substring('user_session='.length);
  }
  return undefined;
}

export async function verifyUserSessionCookieEdge(raw: string | undefined | null): Promise<UserSessionData | null> {
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const key = await getUserSecretEdge();
  if (!key) return null;
  const expected = await hmacSha256Base64urlEdge(key, payload);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const json = new TextDecoder().decode(base64urlDecodeToUint8Array(payload));
    const data = JSON.parse(json) as UserSessionData;
    if (Date.now() > data.exp) return null;
    if (!data.role) data.role = 'COLLAB';
    if (!data.userId) return null;
    return data;
  } catch {
    return null;
  }
}
