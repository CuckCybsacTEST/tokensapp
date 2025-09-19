export {};
/* End-to-end batch generation + ZIP parse + redeem test */
import JSZip from 'jszip';
import { PrismaClient } from '@prisma/client';
import { POST as createPrize } from '../src/app/api/prizes/route';
// Manual batch generation deprecada. TODO: migrar este flujo a /api/batch/generate-all
import { POST as redeemToken } from '../src/app/api/redeem/[tokenId]/route';

async function main() {
  process.env.TOKEN_SECRET ||= 'e2e_secret';
  process.env.PUBLIC_BASE_URL ||= 'https://example.com';

  const prisma = new PrismaClient();
  await prisma.$connect();
  // Ensure minimal tables exist (idempotent for SQLite)
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Prize (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE,
      label TEXT NOT NULL,
      color TEXT,
      description TEXT,
      stock INTEGER,
      active INTEGER DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS Batch (
      id TEXT PRIMARY KEY,
      description TEXT,
      createdBy TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS Token (
      id TEXT PRIMARY KEY,
      prizeId TEXT NOT NULL,
      batchId TEXT NOT NULL,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      redeemedAt DATETIME,
      signature TEXT NOT NULL,
      signatureVersion INTEGER DEFAULT 1,
      disabled INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS SystemConfig (
      id TEXT PRIMARY KEY,
      tokensEnabled INTEGER DEFAULT 1
    );
    INSERT OR IGNORE INTO SystemConfig (id, tokensEnabled) VALUES ('singleton',1);
  `);
  // Ensure new columns exist if DB was created before migrations (idempotent guards)
  const cols: any[] = await prisma.$queryRawUnsafe('PRAGMA table_info(Token);');
  const colNames = cols.map(c => c.name);
  if (!colNames.includes('signatureVersion')) {
    await prisma.$executeRawUnsafe('ALTER TABLE Token ADD COLUMN signatureVersion INTEGER DEFAULT 1');
    console.log('[E2E] Added missing column signatureVersion');
  }
  if (!colNames.includes('disabled')) {
    await prisma.$executeRawUnsafe('ALTER TABLE Token ADD COLUMN disabled INTEGER DEFAULT 0');
    console.log('[E2E] Added missing column disabled');
  }
  const prizeCount = await prisma.prize.count();
  const prizeLabel = `E2E Prize ${prizeCount + 1}`;
  // Create prize via route handler to exercise logic
  const prizeReq = new Request('http://local/api/prizes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label: prizeLabel, stock: 5 }),
  });
  const prizeRes = await createPrize(prizeReq as any);
  if (prizeRes.status !== 201) {
    console.error('Failed to create prize', prizeRes.status, await prizeRes.text());
    process.exit(1);
  }
  const prize = await prizeRes.json();
  console.log('[E2E] Prize created:', prize.id, prize.key);

  // Generación manual deprecada: se omite fase de batch aquí.
  // TODO: llamar endpoint /api/batch/generate-all tras ajustar stock según nuevo flujo.
  // Por ahora abortamos si se requiere token.
  console.log('[E2E] Skipping batch generation (manual endpoint deprecated)');
  const tokenId = 'DEPRECATED_FLOW_NO_TOKEN';

  // Redeem token
  const redeemReq = new Request(`http://local/api/redeem/${tokenId}`, { method: 'POST' });
  const redeemRes = await redeemToken(redeemReq as any, { params: { tokenId } });
  const redeemJson = await redeemRes.json();
  console.log('[E2E] Redeem status', redeemRes.status, redeemJson);
  if (redeemRes.status !== 200) {
    console.error('Redeem failed');
    process.exit(1);
  }
  // Second redeem to validate duplicate handling
  const redeemAgain = await redeemToken(redeemReq as any, { params: { tokenId } });
  console.log('[E2E] Redeem again status', redeemAgain.status, await redeemAgain.text());

  await prisma.$disconnect();
  console.log('[E2E] Flow complete OK');
}

main().catch((e) => {
  console.error('E2E flow error', e);
  process.exit(1);
});
