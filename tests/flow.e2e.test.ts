import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { computeBatchStats } from '@/lib/batchStats';

// Direct DB + calling route handlers in-process (simulate minimal e2e without HTTP server boot)
import * as spinRoute from '@/app/api/roulette/[id]/route';
import * as createRoute from '@/app/api/roulette/route';
import * as deliverRoute from '@/app/api/token/[tokenId]/deliver/route';
import { createSessionCookie } from '@/lib/auth';
import { isTwoPhaseRedemptionEnabled } from '@/lib/featureFlags';

const prisma = new PrismaClient();

async function reset() {
  // TODO: Reemplazar por truncates en Postgres para limpieza más rápida.
  // Eliminado uso de PRAGMA foreign_keys OFF/ON (solo SQLite).
  await prisma.eventLog.deleteMany();
  await prisma.rouletteSpin.deleteMany();
  await prisma.rouletteSession.deleteMany();
  await prisma.token.deleteMany();
  await prisma.prize.deleteMany();
  await prisma.batch.deleteMany();
}

// Minimal NextRequest mock
function mockReq(body?: any, url: string = 'http://localhost'): any {
  return {
    json: async () => body,
    headers: new Map<string, string>(),
    url,
  } as any;
}

async function mockReqWithAdmin(body?: any, url: string = 'http://localhost'): Promise<any> {
  const cookie = await createSessionCookie({ role: 'ADMIN', email: 'e2e@example.com' });
  const headers = new Map<string, string>();
  headers.set('cookie', `admin_session=${cookie}`);
  return {
    json: async () => body,
    headers,
    url,
  } as any;
}

function mockParams(id: string) { return { params: { id } } as any; }
function mockTokenParams(tokenId: string) { return { params: { tokenId } } as any; }

// Force flag on for test environment
process.env.TWO_PHASE_REDEMPTION = '1';

describe('E2E two-phase flow', () => {
  beforeEach(async () => { await reset(); });

  it('spin reveals then delivery confirms and stats update', async () => {
    expect(isTwoPhaseRedemptionEnabled()).toBe(true);
    // Setup: prize & batch & tokens
    const prize = await prisma.prize.create({ data: { key: 'P1', label: 'Premio 1' } });
    const batch = await prisma.batch.create({ data: { description: 'Flow batch' } });
    const tokens = await prisma.$transaction(Array.from({ length: 3 }).map((_,i)=> prisma.token.create({ data: { prizeId: prize.id, batchId: batch.id, expiresAt: new Date(Date.now()+3600_000), signature: 'sig'+i, signatureVersion: 1 } })));

    // Create roulette session (BY_PRIZE) via route
    const createRes = await createRoute.POST(mockReq({ batchId: batch.id }));
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    const sessionId = createBody.sessionId as string;

    // Spin once
    const spinRes = await spinRoute.POST(mockReq(undefined, 'http://localhost'), mockParams(sessionId));
    expect(spinRes.status).toBe(200);
    const spinBody = await spinRes.json();
    expect(spinBody.phase).toBe('REVEALED');
    const revealedTokenId = spinBody.tokenId;
    expect(revealedTokenId).toBeTruthy();

  // Verificar estado tras reveal: revealedAt seteado, deliveredAt null, redeemedAt null (mirror aún vacío)
    const tokenAfterReveal: any = await prisma.token.findUnique({ where: { id: revealedTokenId } });
    expect(tokenAfterReveal.revealedAt).toBeTruthy();
    expect(tokenAfterReveal.deliveredAt).toBeNull();
    expect(tokenAfterReveal.redeemedAt).toBeNull();

    // Deliver token
  const deliverRes = await deliverRoute.POST(await mockReqWithAdmin({}, 'http://localhost'), mockTokenParams(revealedTokenId));
    expect(deliverRes.status).toBe(200);
    const deliverBody = await deliverRes.json();
    expect(deliverBody.phase).toBe('DELIVERED');
    expect(deliverBody.tokenId).toBe(revealedTokenId);

  // Verificar estado tras deliver: deliveredAt y redeemedAt (mirror legacy) seteados
    const tokenAfterDeliver: any = await prisma.token.findUnique({ where: { id: revealedTokenId } });
    expect(tokenAfterDeliver.deliveredAt).toBeTruthy();
    expect(tokenAfterDeliver.redeemedAt).toBeTruthy(); // mirror

    // Stats recompute
    const tokensFull = await prisma.token.findMany({ where: { batchId: batch.id }, include: { prize: true } });
    const stats = computeBatchStats(tokensFull as any);
    expect(stats.revealed).toBeGreaterThanOrEqual(1);
    expect(stats.delivered).toBe(1);
    expect(stats.revealedPending).toBe(stats.revealed - stats.delivered);
  });
});
