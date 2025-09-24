#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

async function main() {
  const url = process.env.DATABASE_URL || '';
  const isPg = /postgres/i.test(url);
  if (!isPg) {
    console.log('[verify-postgres] DATABASE_URL no es Postgres (o está vacío). Saliendo (SQLite/local).');
    process.exit(0);
  }
  const parsed = (() => {
    try {
      const u = new URL(url);
      return { host: u.hostname, db: u.pathname.slice(1), ssl: u.searchParams.get('sslmode') };
    } catch { return undefined; }
  })();
  console.log('[verify-postgres] Conectando a', parsed);
  const prisma = new PrismaClient();
  try {
    // Prueba de conexión simple
  const versionRow = await prisma.$queryRawUnsafe<any[]>(`SELECT version();`);
  console.log('[verify-postgres] version:', versionRow?.[0]?.version || versionRow);

    // Conteo de tablas clave
  const personCount = await prisma.$queryRawUnsafe<any[]>(`SELECT count(*) AS c FROM "Person";`);
  const scanCount = await prisma.$queryRawUnsafe<any[]>(`SELECT count(*) AS c FROM "Scan";`);
    console.log(`[verify-postgres] Person: ${personCount[0].c}, Scan: ${scanCount[0].c}`);

    // Verificar índices parciales (IN / OUT)
    const idx = await prisma.$queryRawUnsafe<any[]>(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename='Scan' AND (indexname ILIKE '%businessday%' OR indexdef ILIKE '%businessDay%');
    `);
    const haveIn = idx.some(r => /businessDay_in_unique/i.test(r.indexname));
    const haveOut = idx.some(r => /businessDay_out_unique/i.test(r.indexname));
    if (!haveIn || !haveOut) {
      console.error('[verify-postgres] FALTAN índices parciales únicos (IN/OUT).');
      console.error('  Esperados: Scan_person_businessDay_in_unique y Scan_person_businessDay_out_unique');
      console.error('  Verifica: npx prisma migrate deploy (en la misma DATABASE_URL)');
      process.exitCode = 2; // clasifica como "faltan índices"
    } else {
      console.log('[verify-postgres] Índices parciales OK.');
    }

    // Inserción de marca simulada (solo si no hay conflicto)
  const testPerson = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM "Person" ORDER BY id LIMIT 1;`);
    if (testPerson.length) {
      const pid = testPerson[0].id;
      const nowIso = new Date().toISOString();
      // Solo testear inserción si no hay marca en el último minuto (sintaxis Postgres)
  const recent = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM "Scan" WHERE "personId"='${pid}' AND "scannedAt" > (now() - interval '1 minute') LIMIT 1;`);
      if (!recent.length) {
        const businessDay = nowIso.slice(0,10); // Si la lógica real difiere, aquí podríamos invocar el helper JS.
        // Usar defaults de Prisma para id/createdAt si existen; si no, explicitamos createdAt.
        await prisma.$executeRawUnsafe(`INSERT INTO "Scan" ("personId","scannedAt","type","businessDay","createdAt") VALUES ('${pid}','${nowIso}','IN','${businessDay}','${nowIso}');`);
        console.log('[verify-postgres] Inserción de prueba OK (IN dummy).');
      } else {
        console.log('[verify-postgres] Saltando inserción (actividad reciente).');
      }
    } else {
      console.warn('[verify-postgres] No hay Person para probar inserción de Scan.');
    }
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.error('[verify-postgres] ERROR:', msg);
    // Clasificación heurística
    if (/password|auth/i.test(msg)) {
      console.error('  -> Posible credencial incorrecta. Revisa usuario/password.');
    } else if (/ENOTFOUND|ECONNREFUSED|timeout/i.test(msg)) {
      console.error('  -> Problema de red / host / puerto / firewall / SSL.');
    } else if (/does not exist|relation .* does not exist/i.test(msg)) {
      console.error('  -> Tabla faltante: ¿ejecutaste npx prisma migrate deploy en esta base?');
    } else if (/SSL/i.test(msg)) {
      console.error('  -> Ajusta sslmode=require o configura certificado según el proveedor.');
    }
    console.error('Sugerencias rápidas:' +
      '\n  1. Ver URL: echo $env:DATABASE_URL' +
      '\n  2. Migrar: npx prisma migrate deploy' +
      '\n  3. Regenerar cliente: npx prisma generate' +
      '\n  4. Probar consulta directa: npx prisma db execute --stdin');
    process.exitCode = 1; // error genérico
  } finally {
    await prisma.$disconnect();
  }
}

main();
