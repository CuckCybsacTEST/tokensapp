import { describe, it, expect } from 'vitest';
import { signClientSecret, verifyClientSecret } from './clientAuth';

// Nota: En dev, clientAuth usa fallback 'dev_secret' si TOKEN_SECRET no está definido.

describe('clientAuth clientSecret', () => {
  it('happy path: sign y verify ok', () => {
    const token = signClientSecret('resv_123', 5); // 5 min
    const ver = verifyClientSecret(token);
    expect(ver.ok).toBe(true);
    if (ver.ok) {
      expect(ver.rid).toBe('resv_123');
    }
  });

  it('expirado: verify -> EXPIRED', () => {
    // TTL negativo para asegurar exp < now de forma determinística
    const token = signClientSecret('resv_abc', -1);
    const ver = verifyClientSecret(token);
    expect(ver.ok).toBe(false);
    if (!ver.ok) {
      expect(ver.code).toBe('EXPIRED');
    }
  });

  it('firma alterada: INVALID', () => {
    const token = signClientSecret('resv_999', 5);
    // Alteramos el último carácter del token para romper la firma
    const tampered = token.slice(0, -1) + (token.slice(-1) === 'A' ? 'B' : 'A');
    const ver = verifyClientSecret(tampered);
    expect(ver.ok).toBe(false);
    if (!ver.ok) {
      expect(ver.code).toBe('INVALID');
    }
  });
});
