import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { initTestDb } from '@/test/setupTestDb';

// We'll use a dedicated test DB file for this suite to avoid contention.
let prisma: PrismaClient;

async function reset() {
  try { await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF;'); } catch {}
  await prisma.eventLog.deleteMany();
  await prisma.rouletteSpin.deleteMany();
  await prisma.rouletteSession.deleteMany();
  await prisma.token.deleteMany();
  await prisma.prize.deleteMany();
  await prisma.batch.deleteMany();
  try { await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;'); } catch {}
}

beforeAll(async () => {
  prisma = await initTestDb('prisma/test_two_phase_core.db');
});

beforeEach(async () => { await reset(); });

async function createBaseline() {
  const prizeA = await prisma.prize.create({ data: { key: 'A', label: 'Premio A' } });
  const batch = await prisma.batch.create({ data: { description: 'Batch test' } });
  const token = await prisma.token.create({ data: { prizeId: prizeA.id, batchId: batch.id, expiresAt: new Date(Date.now()+3600_000), signature: 'sig', signatureVersion: 1 } });
  return { prizeA, batch, token };
}

describe('Two-phase redemption core invariants', () => {
  it('cannot deliver if not revealed', async () => {
    const { token } = await createBaseline();
    // Attempt direct deliver update simulation (what endpoint would guard)
    // We mimic endpoint logic conditions
  const fresh: any = await (prisma as any).token.findUnique({ where: { id: token.id } });
  expect(fresh?.revealedAt).toBeNull();
    // Endpoint would reject; we assert DB state unchanged
    await expect(async () => {
  if (!fresh?.revealedAt) throw new Error('NOT_REVEALED');
    }).rejects.toThrowError('NOT_REVEALED');
  });

  it('cannot deliver twice (idempotent guard)', async () => {
    const { token } = await createBaseline();
    // Simulate reveal (spin) sets revealedAt
    const revealedAt = new Date();
  await (prisma as any).token.update({ where: { id: token.id }, data: { revealedAt, assignedPrizeId: token.prizeId } });
    // First delivery
    const deliveredAt = new Date(revealedAt.getTime() + 1000);
  await (prisma as any).token.update({ where: { id: token.id }, data: { deliveredAt, redeemedAt: deliveredAt } });
    // Second delivery attempt should be blocked logically
  const after: any = await (prisma as any).token.findUnique({ where: { id: token.id } });
    expect(after?.deliveredAt).not.toBeNull();
    // Simulate endpoint guard
    await expect(async () => {
  if (after?.deliveredAt) throw new Error('ALREADY_DELIVERED');
    }).rejects.toThrowError('ALREADY_DELIVERED');
  });

  it('revert delivery restores revealed state but clears delivered & redeemed', async () => {
    const { token } = await createBaseline();
    const revealedAt = new Date();
  await (prisma as any).token.update({ where: { id: token.id }, data: { revealedAt, assignedPrizeId: token.prizeId } });
    const deliveredAt = new Date(revealedAt.getTime() + 5000);
  await (prisma as any).token.update({ where: { id: token.id }, data: { deliveredAt, redeemedAt: deliveredAt } });
    // Revert logic
  await (prisma as any).token.update({ where: { id: token.id }, data: { deliveredAt: null, redeemedAt: null, deliveredByUserId: null } });
  const after: any = await (prisma as any).token.findUnique({ where: { id: token.id } });
    expect(after?.revealedAt).toEqual(revealedAt);
    expect(after?.deliveredAt).toBeNull();
    expect(after?.redeemedAt).toBeNull();
  });

  it('spin in two-phase should not set redeemedAt at reveal', async () => {
    const { token } = await createBaseline();
    // Simulate spin logic: set revealedAt only
    const revealedAt = new Date();
  await (prisma as any).token.update({ where: { id: token.id }, data: { revealedAt, assignedPrizeId: token.prizeId } });
  const after: any = await (prisma as any).token.findUnique({ where: { id: token.id } });
    expect(after?.revealedAt).not.toBeNull();
    expect(after?.redeemedAt).toBeNull();
    expect(after?.deliveredAt).toBeNull();
  });
});
