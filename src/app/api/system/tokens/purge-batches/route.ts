import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/*
POST /api/system/tokens/purge-batches
Body: { batchIds: string[], options?: { deleteUnusedPrizes?: boolean, dryRun?: boolean } }
- Elimina spins y sesiones de ruleta asociadas a esos batches
- Elimina tokens de esos batches
- Elimina los batches
- Opcional: elimina prizes que queden sin tokens (deleteUnusedPrizes)
Devuelve resumen de conteos. Requiere ADMIN (middleware lo asegura)
*/

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const batchIds: string[] = Array.isArray(body.batchIds) ? body.batchIds.filter((b: any) => typeof b === 'string' && b.trim()) : [];
    const deleteUnusedPrizes = !!body?.options?.deleteUnusedPrizes;
    const dryRun = !!body?.options?.dryRun;
    if (!batchIds.length) {
      return NextResponse.json({ ok: false, error: 'NO_BATCH_IDS', message: 'Proporciona batchIds[]' }, { status: 400 });
    }

    // Verificar si hay tokens redimidos / deliverados (los contamos para que el caller decida si continuar)
    const redeemed = await prisma.token.groupBy({
      by: ['batchId'],
      where: { batchId: { in: batchIds }, OR: [{ redeemedAt: { not: null } }, { deliveredAt: { not: null } }] },
      _count: { _all: true },
    });

    // Conteos base
    const tokenCounts = await prisma.token.groupBy({ by: ['batchId'], where: { batchId: { in: batchIds } }, _count: { _all: true } });
    const rouletteSessions = await prisma.rouletteSession.findMany({ where: { batchId: { in: batchIds } }, select: { id: true, batchId: true } });
    const spins = await prisma.rouletteSpin.count({ where: { sessionId: { in: rouletteSessions.map(r => r.id) } } });

    if (dryRun) {
      return NextResponse.json({ ok: true, dryRun: true, batchIds, summary: { tokenCounts, rouletteSessions: rouletteSessions.length, spins, redeemed } });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Borrar spins primero
      if (rouletteSessions.length) {
        await tx.rouletteSpin.deleteMany({ where: { sessionId: { in: rouletteSessions.map(r => r.id) } } });
        await tx.rouletteSession.deleteMany({ where: { id: { in: rouletteSessions.map(r => r.id) } } });
      }
      // Borrar tokens
      await tx.token.deleteMany({ where: { batchId: { in: batchIds } } });
      // Borrar batches
      await tx.batch.deleteMany({ where: { id: { in: batchIds } } });

      let deletedPrizes: string[] = [];
      if (deleteUnusedPrizes) {
        // Prizes sin tokens
        const prizes = await tx.prize.findMany({ select: { id: true }, where: { tokens: { none: {} }, assignedTokens: { none: {} } } });
        if (prizes.length) {
          await tx.prize.deleteMany({ where: { id: { in: prizes.map(p => p.id) } } });
          deletedPrizes = prizes.map(p => p.id);
        }
      }

      return { deletedPrizes } as const;
    });

    return NextResponse.json({ ok: true, batchIds, deleted: { tokenCounts, rouletteSessions: rouletteSessions.length, spins, redeemed, prizes: result.deletedPrizes } });
  } catch (e: any) {
    console.error('purge-batches error', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL', message: e?.message || 'Error interno' }, { status: 500 });
  }
}
