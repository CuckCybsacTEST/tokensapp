import { describe, it, expect, vi } from 'vitest';

// Guard: en producción debe lanzar si falta DATABASE_URL
// Nota: usamos import dinámico tras resetModules para evaluar prisma.ts desde cero.

describe('prisma production env guard', () => {
  it('throws without DATABASE_URL in production', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDb = process.env.DATABASE_URL;
  const originalForce = process.env.FORCE_PRISMA_PROD;

  process.env.DATABASE_URL = ""; // set empty so dotenv in @prisma/client won't repopulate
  process.env.FORCE_PRISMA_PROD = '1';

    vi.resetModules();
    let threw = false;
    try {
      await import('../src/lib/prisma');
    } catch (e: any) {
      threw = true;
      expect(String(e.message || e)).toMatch(/Missing DATABASE_URL/);
    }
    expect(threw).toBe(true);

    // restore
  (process as any).env.NODE_ENV = originalNodeEnv;
    if (originalDb) process.env.DATABASE_URL = originalDb;
    if (originalForce) process.env.FORCE_PRISMA_PROD = originalForce; else delete process.env.FORCE_PRISMA_PROD;
  });
});
