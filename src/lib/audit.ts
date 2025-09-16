import { prisma } from '@/lib/prisma';

// Basic PII/sensitive fields sanitizer for audit metadata.
// Redacts values of known-sensitive keys and trims strings to a safe length.
function sanitizeMeta(input: any): any {
  const SENSITIVE_KEYS = new Set([
    'email', 'phone', 'documento', 'dni', 'password', 'pass', 'token', 'code', 'claim', 'signature', 'sig', 'cookie', 'authorization', 'auth', 'session', 'secret', 'key',
  ]);
  const MAX_STR = 200; // cap long strings to avoid dumping blobs

  function redact(val: any): any {
    if (val === null || val === undefined) return val;
    if (typeof val === 'string') {
      // trim long strings
      const trimmed = val.length > MAX_STR ? val.slice(0, MAX_STR) + '…' : val;
      return trimmed;
    }
    if (typeof val === 'number' || typeof val === 'boolean') return val;
    if (Array.isArray(val)) return val.slice(0, 50).map((v) => redact(v));
    if (typeof val === 'object') return walk(val);
    return undefined;
  }

  function walk(obj: Record<string, any>): any {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      const keyLower = k.toLowerCase();
      if (SENSITIVE_KEYS.has(keyLower)) {
        out[k] = '[REDACTED]';
      } else if (keyLower.includes('email') || keyLower.includes('phone') || keyLower.includes('document') || keyLower === 'dni') {
        out[k] = '[REDACTED]';
      } else if (keyLower.includes('token') || keyLower.includes('code') || keyLower.includes('secret')) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redact(v);
      }
    }
    return out;
  }

  if (input === null || input === undefined) return {};
  if (typeof input !== 'object') return { value: redact(input) };
  return walk(input);
}

/**
 * Lightweight audit helper for writing eventLog entries.
 * action: string token describing the event (e.g. 'tokens.test-mode')
 * byUserId: optional identifier of the acting user
 * meta: optional metadata object (will be JSON.stringified)
 */
export async function audit(action: string, byUserId?: string, meta?: any) {
  try {
    const safeMeta = sanitizeMeta(meta);
    const entry = await prisma.eventLog.create({
      data: {
        type: action,
        message: `${action}${byUserId ? ' by ' + byUserId : ''}`,
        metadata: JSON.stringify(safeMeta),
      },
    });
    return entry;
  } catch (e) {
    // Audit failures should not block the main flow; log and continue.
    console.error('audit failed', e);
    return null;
  }
}
