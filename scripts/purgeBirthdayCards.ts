import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

async function main() {
  const now = Date.now();
  const cutoffMs = now - 30 * 24 * 3600 * 1000; // 30 días
  // Buscar tokens expirados hace más de 30 días
  const oldTokens = await prisma.inviteToken.findMany({
    where: { expiresAt: { lt: new Date(cutoffMs) } },
    select: { id: true, reservationId: true, expiresAt: true, card: true }
  });
  if (!oldTokens.length) {
    console.log('No hay tokens antiguos para purgar');
    return;
  }
  let removed = 0;
  for (const t of oldTokens) {
    if (!t.card) continue;
    const rel = t.card.filePath;
    const abs = path.resolve(process.cwd(), 'public', rel);
    try { await fs.promises.unlink(abs); removed++; } catch {}
    try {
      // @ts-ignore prisma delegate will exist post-migration
      await prisma.inviteTokenCard.delete({ where: { inviteTokenId: t.id } });
    } catch {}
  }
  console.log(`Purgadas ${removed} tarjetas`);
}

main().catch(e => { console.error(e); process.exit(1); });
