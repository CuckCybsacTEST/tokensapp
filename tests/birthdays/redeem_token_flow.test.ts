import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initTestDb } from '@/test/setupTestDb';
import type { PrismaClient } from '@prisma/client';

let db: PrismaClient;

async function ensureBirthdayTables() {
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS BirthdayPack (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE,
    qrCount INTEGER NOT NULL,
    bottle TEXT NOT NULL,
    perks TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    featured INTEGER NOT NULL DEFAULT 0
  );`);
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS BirthdayReservation (
    id TEXT PRIMARY KEY,
    celebrantName TEXT NOT NULL,
    phone TEXT NOT NULL,
    documento TEXT NOT NULL,
    email TEXT,
    date DATETIME NOT NULL,
    timeSlot TEXT NOT NULL,
    packId TEXT NOT NULL,
    guestsPlanned INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    tokensGeneratedAt DATETIME,
    createdBy TEXT,
    updatedBy TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS InviteToken (
    id TEXT PRIMARY KEY,
    reservationId TEXT NOT NULL,
    code TEXT UNIQUE,
    kind TEXT NOT NULL DEFAULT 'guest',
    status TEXT NOT NULL DEFAULT 'unclaimed',
    expiresAt DATETIME NOT NULL,
    claim TEXT NOT NULL,
    metadata TEXT,
    usedCount INTEGER NOT NULL DEFAULT 0,
    maxUses INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS TokenRedemption (
    id TEXT PRIMARY KEY,
    tokenId TEXT NOT NULL,
    redeemedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    by TEXT,
    device TEXT,
    location TEXT,
    reservationId TEXT
  );`);
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS CourtesyItem (
    id TEXT PRIMARY KEY,
    reservationId TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS PhotoDeliverable (
    id TEXT PRIMARY KEY,
    reservationId TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'group',
    url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);
  try {
    const info: any[] = await db.$queryRawUnsafe('PRAGMA table_info(InviteToken)');
    const hasUsed = info.some((c: any) => String(c.name).toLowerCase() === 'usedcount');
    const hasMax = info.some((c: any) => String(c.name).toLowerCase() === 'maxuses');
    if (!hasUsed) await db.$executeRawUnsafe(`ALTER TABLE InviteToken ADD COLUMN usedCount INTEGER NOT NULL DEFAULT 0`);
    if (!hasMax) await db.$executeRawUnsafe(`ALTER TABLE InviteToken ADD COLUMN maxUses INTEGER`);
  } catch {}
}

async function seedPack() {
  await db.$executeRawUnsafe('DELETE FROM TokenRedemption');
  await db.$executeRawUnsafe('DELETE FROM InviteToken');
  await db.$executeRawUnsafe('DELETE FROM BirthdayReservation');
  await db.$executeRawUnsafe('DELETE FROM BirthdayPack');
  await db.$executeRawUnsafe(`INSERT INTO BirthdayPack (id, name, qrCount, bottle, perks, active, featured)
    VALUES ('pack1','Chispa',2,'Botella','[]',1,0)`);
}

describe('Birthdays: redeem token flow', () => {
  beforeEach(async () => {
    db = await initTestDb('prisma/test_birthdays_redeem.db');
    await ensureBirthdayTables();
    await seedPack();
    await db.$executeRawUnsafe('DELETE FROM EventLog');
    process.env.TOKEN_SECRET = 'test_secret_birthdays_redeem';
    process.env.BIRTHDAY_TOKEN_TTL_HOURS = '1'; // short but non-zero
  vi.resetModules();
  (global as any)._prisma = db;
  });

  it('happy path: redeem valid token', async () => {
    const { createReservation, approveReservation, generateInviteTokens, redeemToken } = await import('@/lib/birthdays/service');
    const r = await createReservation({ celebrantName: 'Leo', phone: '1', documento: '2', date: new Date('2025-10-01T00:00:00Z'), timeSlot: '20:00', packId: 'pack1', guestsPlanned: 2 });
    await approveReservation(r.id);
    const toks = await generateInviteTokens(r.id);
    const host = toks.find(t => t.kind === 'host')!;
    const res = await redeemToken(host.code, { by: 'guest', device: 'scanner' });
    expect(res.token.status === 'exhausted' || res.token.status === 'redeemed').toBe(true);
    expect((res.token as any).usedCount).toBe(1);
    expect((res.token as any).maxUses).toBe(1);
    expect(res.redemption.tokenId).toBe(res.token.id);
  });

  it('edge: reusing a token after redemption is blocked', async () => {
    const { createReservation, approveReservation, generateInviteTokens, redeemToken } = await import('@/lib/birthdays/service');
    const r = await createReservation({ celebrantName: 'Mia', phone: '2', documento: '3', date: new Date('2025-10-02T00:00:00Z'), timeSlot: '20:00', packId: 'pack1', guestsPlanned: 2 });
    await approveReservation(r.id);
    const toks = await generateInviteTokens(r.id);
    const host = toks.find(t => t.kind === 'host')!;
    await redeemToken(host.code);
    await expect(redeemToken(host.code)).rejects.toThrowError('TOKEN_EXHAUSTED');
  });

  it('edge: expired token is rejected', async () => {
    const { createReservation, approveReservation, generateInviteTokens } = await import('@/lib/birthdays/service');
    const r = await createReservation({ celebrantName: 'Noe', phone: '3', documento: '4', date: new Date('2025-10-03T00:00:00Z'), timeSlot: '21:00', packId: 'pack1', guestsPlanned: 2 });
    await approveReservation(r.id);
    const toks = await generateInviteTokens(r.id);
    const t = toks[0];
    // Force expiration in DB
    const past = new Date(Date.now() - 1000);
  await db.$executeRawUnsafe(`UPDATE InviteToken SET expiresAt='${past.toISOString()}' WHERE id='${t.id}'`);
    const { redeemToken } = await import('@/lib/birthdays/service');
    await expect(redeemToken(t.code)).rejects.toThrowError('TOKEN_EXPIRED');
  });
});
