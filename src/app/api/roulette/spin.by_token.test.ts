import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { initTestDbMulti } from '@/test/setupTestDb';

let prisma: PrismaClient;
let createHandler: any; // POST /api/roulette
let spinHandler: any;   // POST /api/roulette/[id]
let getHandler: any;    // GET /api/roulette/[id]

async function seedTokens(batchId: string, tokens: { prizeId: string; prizeLabel: string; count: number }[]) {
  await prisma.$executeRawUnsafe(`DELETE FROM Prize;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Batch;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Token;`);
  await prisma.$executeRawUnsafe(`DELETE FROM RouletteSpin;`);
  await prisma.$executeRawUnsafe(`DELETE FROM RouletteSession;`);
  await prisma.$executeRawUnsafe(`INSERT INTO Batch (id, description) VALUES (?, 'batch token');`, batchId);
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  for (const spec of tokens) {
    await prisma.$executeRawUnsafe(`INSERT INTO Prize (id,key,label,active,emittedTotal) VALUES (?,?,?,1,0);`, spec.prizeId, spec.prizeId, spec.prizeLabel);
    for (let i=0;i<spec.count;i++) {
      const tokenId = `${spec.prizeId}_tok${i}`;
      await prisma.$executeRawUnsafe(`INSERT INTO Token (id,prizeId,batchId,expiresAt,signature,signatureVersion,disabled) VALUES (?,?,?,?,?,?,0);`, tokenId, spec.prizeId, batchId, expiresAt, 'sig', 1);
    }
  }
}

beforeAll(async () => {
  prisma = await initTestDbMulti('test_roulette_token.db', 10);
  (global as any)._prisma = prisma;
  ({ POST: createHandler } = await import('./route'));
  ({ POST: spinHandler, GET: getHandler } = await import('./[id]/route'));
});

afterAll(async () => { await prisma.$disconnect(); });

describe('Roulette BY_TOKEN mode', () => {
  it('creates BY_TOKEN session when mode=token and total tokens <=12 and depletes exactly', async () => {
    await seedTokens('bTok1', [
      { prizeId: 'p1', prizeLabel: 'P1', count: 2 },
      { prizeId: 'p2', prizeLabel: 'P2', count: 1 },
      { prizeId: 'p3', prizeLabel: 'P3', count: 1 },
    ]);
    const createReq = new Request('http://localhost/api/roulette?mode=token', { method: 'POST', body: JSON.stringify({ batchId: 'bTok1' }), headers: { 'content-type': 'application/json' } });
    const res = await createHandler(createReq as any);
    expect(res.status).toBe(201);
    const json: any = await res.json();
    expect(json.mode).toBe('BY_TOKEN');
    expect(json.maxSpins).toBe(4);
    const { sessionId } = json;

    let spins = 0;
    while (true) {
      const sreq = new Request(`http://localhost/api/roulette/${sessionId}`, { method: 'POST', headers: { 'x-forwarded-for': '9.9.9.9' } });
      const sres = await spinHandler(sreq as any, { params: { id: sessionId } });
      if (sres.status === 200) {
        const sj: any = await sres.json();
        spins++;
        if (sj.finished) break;
      } else if (sres.status === 409) {
        const err: any = await sres.json();
        expect(err.error).toBe('FINISHED');
        break;
      } else {
        const err: any = await sres.json();
        throw new Error(`Unexpected status ${sres.status} error=${err.error}`);
      }
      if (spins > 10) throw new Error('Loop runaway');
    }
    expect(spins).toBe(4);

    const getRes = await getHandler(new Request(`http://localhost/api/roulette/${sessionId}`) as any, { params: { id: sessionId } });
    expect(getRes.status).toBe(200);
    const session: any = await getRes.json();
    expect(session.finished).toBe(true);
    expect(session.spins.length).toBe(4);
    expect(session.mode).toBe('BY_TOKEN');
  }, 60000);

  it('rejects BY_TOKEN if >12 tokens', async () => {
    await seedTokens('bTok2', [ { prizeId: 'p1', prizeLabel: 'P1', count: 13 } ]);
    const createReq = new Request('http://localhost/api/roulette?mode=token', { method: 'POST', body: JSON.stringify({ batchId: 'bTok2' }), headers: { 'content-type': 'application/json' } });
    const res = await createHandler(createReq as any);
    expect(res.status).toBe(400);
    const json: any = await res.json();
    expect(json.error).toBe('NOT_ELIGIBLE');
  });
});
