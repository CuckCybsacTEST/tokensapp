import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { initTestDbMulti } from '@/test/setupTestDb';

let prisma: PrismaClient;
let createHandler: any; // POST /api/roulette
let spinHandler: any; // POST /api/roulette/[id]
let getHandler: any; // GET /api/roulette/[id]

/** Helper to insert prizes + batch + tokens */
async function seedBatch(prizeSpecs: { id: string; label: string; count: number }[], batchId: string) {
  await prisma.$executeRawUnsafe(`DELETE FROM Prize;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Batch;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Token;`);
  await prisma.$executeRawUnsafe(`DELETE FROM RouletteSpin;`);
  await prisma.$executeRawUnsafe(`DELETE FROM RouletteSession;`);
  await prisma.$executeRawUnsafe(`INSERT INTO Batch (id, description) VALUES (?, 'test batch');`, batchId);
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  for (const p of prizeSpecs) {
    await prisma.$executeRawUnsafe(`INSERT INTO Prize (id,key,label,active,emittedTotal) VALUES (?,?,?,1,0);`, p.id, p.id, p.label);
    for (let i = 0; i < p.count; i++) {
      const tokenId = `${p.id}_t${i}`;
      // id,prizeId,batchId,expiresAt,signature,signatureVersion,disabled
      await prisma.$executeRawUnsafe(
        `INSERT INTO Token (id,prizeId,batchId,expiresAt,signature,signatureVersion,disabled) VALUES (?,?,?,?,?,?,0);`,
        tokenId,
        p.id,
        batchId,
        expiresAt,
        'sig',
        1
      );
    }
  }
}

beforeAll(async () => {
  prisma = await initTestDbMulti('test_roulette_spin.db', 10);
  (global as any)._prisma = prisma; // ensure route modules reuse this instance
  ({ POST: createHandler } = await import('./route'));
  ({ POST: spinHandler, GET: getHandler } = await import('./[id]/route'));
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Roulette spin endpoint', () => {
  // Full-suite runs can be slower; allow more time for these integration-style tests
  it('creates session and spins until depletion, verifying counts', async () => {
    const batchId = 'bRou1';
    const prizes = [
      { id: 'p1', label: 'P1', count: 2 },
      { id: 'p2', label: 'P2', count: 3 },
      { id: 'p3', label: 'P3', count: 1 },
    ];
    const totalTokens = prizes.reduce((a, p) => a + p.count, 0);
    await seedBatch(prizes, batchId);

    // Crear sesión
    const createReq = new Request('http://localhost/api/roulette', { method: 'POST', body: JSON.stringify({ batchId }), headers: { 'content-type': 'application/json' } });
    const createRes = await createHandler(createReq as any);
    expect(createRes.status).toBe(201);
    const createJson: any = await createRes.json();
    expect(createJson.mode).toBe('BY_PRIZE');
    expect(createJson.maxSpins).toBe(totalTokens);
    const sessionId = createJson.sessionId as string;
    expect(sessionId).toBeTruthy();

    // Realizar spins hasta que termine
    let spins = 0;
    const counts: Record<string, number> = { p1: 0, p2: 0, p3: 0 };
    while (true) {
      const spinReq = new Request(`http://localhost/api/roulette/${sessionId}`, { method: 'POST', headers: { 'x-forwarded-for': '1.1.1.1' } });
      const spinRes = await spinHandler(spinReq as any, { params: { id: sessionId } });
      if (spinRes.status === 200) {
        const spinJson: any = await spinRes.json();
        counts[spinJson.chosen.prizeId]++;
        spins++;
        if (spinJson.finished) break; // finishedNow
      } else if (spinRes.status === 409) {
        const err: any = await spinRes.json();
        expect(['FINISHED']).toContain(err.error);
        break;
      } else {
        const err: any = await spinRes.json();
        throw new Error(`Unexpected status ${spinRes.status} error=${err.error}`);
      }
      if (spins > totalTokens + 2) {
        throw new Error('Loop runaway');
      }
    }

    expect(spins).toBe(totalTokens);
    expect(counts.p1 + counts.p2 + counts.p3).toBe(totalTokens);
    expect(counts.p1).toBe(2);
    expect(counts.p2).toBe(3);
    expect(counts.p3).toBe(1);

    // GET session to confirm finished and spinsHistory length
    const getReq = new Request(`http://localhost/api/roulette/${sessionId}`, { method: 'GET' });
    const getRes = await getHandler(getReq as any, { params: { id: sessionId } });
    expect(getRes.status).toBe(200);
    const sessionJson: any = await getRes.json();
    expect(sessionJson.finished).toBe(true);
    expect(sessionJson.spins.length).toBe(totalTokens);
    expect(sessionJson.status).toBe('FINISHED');
  }, 60000);
});
