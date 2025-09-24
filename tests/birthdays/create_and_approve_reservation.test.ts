import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initTestDb } from '@/test/setupTestDb';
import type { PrismaClient } from '@prisma/client';

let db: PrismaClient;

async function ensureBirthdayTables() {
  // Minimal DDL for birthday models used in service
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
  // Ensure InviteToken has multi-use columns even if table existed from previous runs
  try {
    const info: any[] = await db.$queryRawUnsafe('PRAGMA table_info(InviteToken)');
    const hasUsed = info.some((c: any) => String(c.name).toLowerCase() === 'usedcount');
    const hasMax = info.some((c: any) => String(c.name).toLowerCase() === 'maxuses');
    if (!hasUsed) await db.$executeRawUnsafe(`ALTER TABLE InviteToken ADD COLUMN usedCount INTEGER NOT NULL DEFAULT 0`);
    if (!hasMax) await db.$executeRawUnsafe(`ALTER TABLE InviteToken ADD COLUMN maxUses INTEGER`);
  } catch {}
}

async function seedPacks() {
  // Reset all birthday-related tables to avoid cross-test interference
  await db.$executeRawUnsafe('DELETE FROM TokenRedemption');
  await db.$executeRawUnsafe('DELETE FROM InviteToken');
  await db.$executeRawUnsafe('DELETE FROM CourtesyItem');
  await db.$executeRawUnsafe('DELETE FROM PhotoDeliverable');
  await db.$executeRawUnsafe('DELETE FROM BirthdayReservation');
  await db.$executeRawUnsafe('DELETE FROM BirthdayPack');
  await db.$executeRawUnsafe(`INSERT INTO BirthdayPack (id, name, qrCount, bottle, perks, active, featured)
    VALUES ('pack1','Chispa',8,'Botella 1','["Velitas","Decoración"]',1,1)`);
}

describe('Birthdays: create → approve → generate tokens', () => {
  beforeEach(async () => {
    db = await initTestDb('prisma/test_birthdays_core.db');
    await ensureBirthdayTables();
    await seedPacks();
    // Clean event log to avoid interference
    await db.$executeRawUnsafe('DELETE FROM EventLog');
    // Ensure service uses this prisma instance
    vi.resetModules();
    (global as any)._prisma = db;
  });

  it('happy path: creates reservation, approves, generates tokens with valid signatures and expiration', async () => {
    process.env.TOKEN_SECRET = 'test_secret_birthdays_1';
    process.env.BIRTHDAY_TOKEN_TTL_HOURS = '72';
    const { createReservation, approveReservation, generateInviteTokens } = await import('@/lib/birthdays/service');
    const { verifyBirthdayClaim } = await import('@/lib/birthdays/token');

    const r = await createReservation({
      celebrantName: 'Juan', phone: '123456', documento: '30111222', email: 'j@example.com',
      date: new Date('2025-10-10T00:00:00Z'), timeSlot: '19:00', packId: 'pack1', guestsPlanned: 10,
    });
    expect(r.status).toBe('pending_review');

    const approved = await approveReservation(r.id);
    expect(approved.status).toBe('approved');

    const tokens = await generateInviteTokens(r.id);
    // Two-token model: one host + one guest
    expect(tokens.length).toBe(2);
    const host = tokens.find((t: any) => t.kind === 'host');
    const guest = tokens.find((t: any) => t.kind === 'guest');
    expect(Boolean(host && guest)).toBe(true);

    // Assert each token has valid claim and consistent exp
    for (const t of tokens as any[]) {
      expect(typeof t.code).toBe('string');
      expect(t.code.length).toBeGreaterThanOrEqual(6);
      const parsed = JSON.parse(t.claim);
      const ver = verifyBirthdayClaim(parsed);
      expect(ver.ok).toBe(true);
      if (ver.ok) {
        expect(ver.payload.rid).toBe(r.id);
        expect(ver.payload.code).toBe(t.code);
      }
      // Close to DB expiresAt (within a minute)
      const expMs = ver.ok ? ver.payload.exp * 1000 : 0;
      const diff = Math.abs(new Date(expMs).getTime() - new Date(t.expiresAt).getTime());
      expect(diff).toBeLessThanOrEqual(60_000);
    }
  });

  it('edge: idempotent generation returns same tokens when called again', async () => {
    process.env.TOKEN_SECRET = 'test_secret_birthdays_2';
    const { createReservation, approveReservation, generateInviteTokens, listTokens } = await import('@/lib/birthdays/service');
    const r = await createReservation({
      celebrantName: 'Ana', phone: '999', documento: '30111223', date: new Date('2025-10-11T00:00:00Z'), timeSlot: '20:00', packId: 'pack1', guestsPlanned: 5,
    });
    await approveReservation(r.id);
    const first = await generateInviteTokens(r.id);
    const second = await generateInviteTokens(r.id);
    expect(second.map((t: any) => t.code).sort()).toEqual(first.map((t: any) => t.code).sort());
    const listed = await listTokens(r.id);
    expect(listed.length).toBe(first.length);
  });

  it('edge: force top-up increases to pack qrCount if initially partial', async () => {
    process.env.TOKEN_SECRET = 'test_secret_birthdays_3';
    const { createReservation, approveReservation, generateInviteTokens } = await import('@/lib/birthdays/service');

    const r = await createReservation({
      celebrantName: 'Luz', phone: '888', documento: '30111224', date: new Date('2025-10-12T00:00:00Z'), timeSlot: '18:00', packId: 'pack1', guestsPlanned: 3,
    });
    await approveReservation(r.id);

    // Simulate a partial pre-existing token
    await db.$executeRawUnsafe(`INSERT INTO InviteToken (reservationId, code, kind, status, expiresAt, claim) VALUES (
      '${r.id}', 'ABC123', 'guest', 'unclaimed', '${new Date(Date.now()+3600_000).toISOString()}', '{"payload":{},"sig":"x"}'
    )`);

    const tokens = await generateInviteTokens(r.id, { force: true });
    expect(tokens.length).toBe(2);
    // Ensure the manual code is kept as guest
    const guest = tokens.find((t: any) => t.kind === 'guest');
    expect(guest?.code).toBe('ABC123');
  });
});
