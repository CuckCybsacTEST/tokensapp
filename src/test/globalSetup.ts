import { afterAll, afterEach } from 'vitest';
import { __resetRateLimitStore } from '@/lib/rateLimit';

// Nota: invalidar la cache de premios globalmente aquí causaba que rutas importadas antes
// perdieran sincronización con el estado seed (provocando NO_ACTIVE_PRIZES). Cada test
// invalida explícitamente cuando lo necesita. Aquí solo reiniciamos rate limit + flag race.
afterEach(() => {
  try { __resetRateLimitStore(); } catch {}
  delete (process as any).env.FORCE_RACE_TEST;
});

// Asegura que si algún test crea múltiples PrismaClient, todos se desconecten.
afterAll(async () => {
  const g: any = globalThis as any;
  // soportar antiguo nombre prismaGlobal y nuevo _prisma
  if (g.prismaGlobal && typeof g.prismaGlobal.$disconnect === 'function') {
    try { await g.prismaGlobal.$disconnect(); } catch {}
    delete g.prismaGlobal;
  }
  if (g._prisma && typeof g._prisma.$disconnect === 'function') {
    try { await g._prisma.$disconnect(); } catch {}
    delete g._prisma;
  }
});
