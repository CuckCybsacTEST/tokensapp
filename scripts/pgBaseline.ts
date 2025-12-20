#!/usr/bin/env tsx
/**
 * Crea un baseline en una base Postgres vacía usando db push.
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
  console.log('[pgBaseline] Ejecutando prisma db push...');
  try {
    run('npx prisma db push');
    console.log('[pgBaseline] Schema aplicado exitosamente.');
    process.exit(0);
  } catch (e) {
    console.error('[pgBaseline] db push falló:', (e as any)?.message);
    process.exit(1);
  }
})();
