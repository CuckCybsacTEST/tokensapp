import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { initTestDbMulti } from '@/test/setupTestDb';

let prisma: PrismaClient;
let createHandler: any; // POST /api/roulette
let spinHandler: any;   // POST /api/roulette/[id]
let getHandler: any;    // GET /api/roulette/[id]

async function seed(prizes: { id: string; label: string; count: number }[], batchId: string) {
  await prisma.$executeRawUnsafe(`DELETE FROM Prize;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Batch;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Token;`);
  await prisma.$executeRawUnsafe(`DELETE FROM RouletteSpin;`);
  await prisma.$executeRawUnsafe(`DELETE FROM RouletteSession;`);
  await prisma.$executeRawUnsafe(`INSERT INTO Batch (id, description) VALUES (?, 'batch');`, batchId);
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  for (const p of prizes) {
    await prisma.$executeRawUnsafe(`INSERT INTO Prize (id,key,label,active,emittedTotal) VALUES (?,?,?,1,0);`, p.id, p.id, p.label);
    for (let i = 0; i < p.count; i++) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO Token (id,prizeId,batchId,expiresAt,signature,signatureVersion,disabled) VALUES (?,?,?,?,?,?,0);`,
        `${p.id}_t${i}`,
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
  prisma = await initTestDbMulti('test_roulette_conc.db', 10);
  (global as any)._prisma = prisma;
  ({ POST: createHandler } = await import('./route'));
  ({ POST: spinHandler, GET: getHandler } = await import('./[id]/route'));
});

afterAll(async () => { await prisma.$disconnect(); });

describe('Roulette concurrent spins', () => {
  it('two concurrent spins with 2 total tokens assign unique sequential orders (1 & 2)', async () => {
    await seed([
      { id: 'p1', label: 'P1', count: 1 },
      { id: 'p2', label: 'P2', count: 1 },
    ], 'bConc2');
    const createReq = new Request('http://localhost/api/roulette', { method: 'POST', body: JSON.stringify({ batchId: 'bConc2' }), headers: { 'content-type': 'application/json' } });
    const createRes = await createHandler(createReq as any);
    expect(createRes.status).toBe(201);
    const { sessionId } = await createRes.json() as any;

    const spinReqFactory = () => new Request(`http://localhost/api/roulette/${sessionId}`, { method: 'POST', headers: { 'x-forwarded-for': '2.2.2.2' } });

    // Launch concurrently
    const [r1, r2] = await Promise.all([
      spinHandler(spinReqFactory() as any, { params: { id: sessionId } }),
      spinHandler(spinReqFactory() as any, { params: { id: sessionId } }),
    ]);
    expect([200]).toContain(r1.status);
    expect([200]).toContain(r2.status);
    const j1: any = await r1.json();
    const j2: any = await r2.json();
    expect(j1.order).not.toBe(j2.order);
    const orders = [j1.order, j2.order].sort();
    expect(orders).toEqual([1,2]);

    const getRes = await getHandler(new Request(`http://localhost/api/roulette/${sessionId}`) as any, { params: { id: sessionId } });
    expect(getRes.status).toBe(200);
    const session: any = await getRes.json();
    expect(session.spins.length).toBe(2);
    expect(session.finished).toBe(true);
  });

  it('race for last remaining token: after one spin, two concurrent spins -> one succeeds (order 2), other 409 FINISHED', async () => {
    await seed([
      { id: 'p1', label: 'P1', count: 1 },
      { id: 'p2', label: 'P2', count: 1 },
    ], 'bConcLast');
    const createReq = new Request('http://localhost/api/roulette', { method: 'POST', body: JSON.stringify({ batchId: 'bConcLast' }), headers: { 'content-type': 'application/json' } });
    const createRes = await createHandler(createReq as any);
    expect(createRes.status).toBe(201);
    const { sessionId } = await createRes.json() as any;

    // First spin sequential (consumes 1 of 2 tokens)
    const firstSpinReq = new Request(`http://localhost/api/roulette/${sessionId}`, { method: 'POST', headers: { 'x-forwarded-for': '4.4.4.4' } });
    const firstSpinRes = await spinHandler(firstSpinReq as any, { params: { id: sessionId } });
    expect(firstSpinRes.status).toBe(200);
    const firstJson: any = await firstSpinRes.json();
    expect(firstJson.order).toBe(1);
    expect(firstJson.finished).toBe(false);

    // Two concurrent spins compete for last token
    const spinReqFactory = () => new Request(`http://localhost/api/roulette/${sessionId}`, { method: 'POST', headers: { 'x-forwarded-for': '5.5.5.5' } });
    const [r1, r2] = await Promise.all([
      spinHandler(spinReqFactory() as any, { params: { id: sessionId } }),
      spinHandler(spinReqFactory() as any, { params: { id: sessionId } }),
    ]);
    const sorted = [r1.status, r2.status].sort();
    expect(sorted).toEqual([200, 409]);
    const jr1: any = await r1.json();
    const jr2: any = await r2.json();
    const win = r1.status === 200 ? jr1 : jr2;
    expect(win.order).toBe(2);
    const lose = r1.status === 409 ? jr1 : jr2;
    expect(lose.error).toBe('FINISHED');

    const getRes = await getHandler(new Request(`http://localhost/api/roulette/${sessionId}`) as any, { params: { id: sessionId } });
    const session: any = await getRes.json();
    expect(session.spins.length).toBe(2);
    expect(session.finished).toBe(true);
  });
});
