#!/usr/bin/env tsx
/**
 * Crea un baseline en una base Postgres vacía intentando aplicar migraciones.
 * Si migraciones fallan (p.ej., incompatibilidad inicial), ofrece fallback opcional a db push.
 */
import { execSync } from 'node:child_process';

function run(cmd: string) {
  execSync(cmd, { stdio: 'inherit' });
}

(function main() {
  const url = process.env.DATABASE_URL || '';
  if (!/postgres/i.test(url)) {
    console.error('[pgBaseline] DATABASE_URL no es Postgres. Abort.');
    process.exit(1);
  }
  console.log('[pgBaseline] Intentando prisma migrate deploy...');
  try {
    run('npx prisma migrate deploy');
    console.log('[pgBaseline] Migraciones aplicadas.');
    process.exit(0);
  } catch (e) {
    console.warn('[pgBaseline] migrate deploy falló:', (e as any)?.message);
  }
  if (process.argv.includes('--push')) {
    console.log('[pgBaseline] Fallback: prisma db push (creará schema sin historial).');
    try {
      run('npx prisma db push');
      console.log('[pgBaseline] db push OK (baseline sin historial).');
      process.exit(0);
    } catch (e) {
      console.error('[pgBaseline] db push también falló:', (e as any)?.message);
      process.exit(2);
    }
  } else {
    console.log('[pgBaseline] Usa --push para forzar fallback a db push.');
    process.exit(1);
  }
})();
