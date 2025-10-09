import { prisma } from '../src/lib/prisma';

/**
 * Direct DB backfill: deshabilita (disabled=true) todos los tokens funcionales
 * pareados por retries (pairedNextTokenId) que sigan activos.
 * No necesita que el servidor esté corriendo.
 */
async function main() {
  console.log('[direct-backfill] start');
  // Usamos una CTE para devolver ids afectados
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    WITH upd AS (
      SELECT tFunc.id
      FROM "Token" tRetry
      JOIN "Prize" pRetry ON pRetry.id = tRetry."prizeId" AND pRetry.key = 'retry'
      JOIN "Token" tFunc ON tFunc.id = tRetry."pairedNextTokenId"
      JOIN "Prize" pFunc ON pFunc.id = tFunc."prizeId"
      WHERE tRetry."pairedNextTokenId" IS NOT NULL
        AND tFunc."disabled" = false
        AND tFunc."redeemedAt" IS NULL
        AND tFunc."revealedAt" IS NULL
        AND tFunc."expiresAt" > now()
        AND pFunc.key NOT IN ('retry','lose')
    )
    UPDATE "Token" SET "disabled" = true
    WHERE id IN (SELECT id FROM upd)
    RETURNING id;
  `;
  console.log('[direct-backfill] disabled count:', rows.length);
  if (rows.length) {
    console.log('[direct-backfill] first 10 ids:', rows.slice(0, 10));
  }
  await prisma.$disconnect();
  console.log('[direct-backfill] done');
}

main().catch(e => {
  console.error('[direct-backfill] error', e);
  prisma.$disconnect().catch(()=>{}).finally(()=> process.exit(1));
});
