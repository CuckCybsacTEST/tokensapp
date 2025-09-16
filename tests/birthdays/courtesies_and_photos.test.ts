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
  try {
    const info: any[] = await db.$queryRawUnsafe('PRAGMA table_info(InviteToken)');
    const hasUsed = info.some((c: any) => String(c.name).toLowerCase() === 'usedcount');
    const hasMax = info.some((c: any) => String(c.name).toLowerCase() === 'maxuses');
    if (!hasUsed) await db.$executeRawUnsafe(`ALTER TABLE InviteToken ADD COLUMN usedCount INTEGER NOT NULL DEFAULT 0`);
    if (!hasMax) await db.$executeRawUnsafe(`ALTER TABLE InviteToken ADD COLUMN maxUses INTEGER`);
  } catch {}
}

async function seedPack() {
  await db.$executeRawUnsafe('DELETE FROM CourtesyItem');
  await db.$executeRawUnsafe('DELETE FROM PhotoDeliverable');
  await db.$executeRawUnsafe('DELETE FROM BirthdayReservation');
  await db.$executeRawUnsafe('DELETE FROM BirthdayPack');
  await db.$executeRawUnsafe(`INSERT INTO BirthdayPack (id, name, qrCount, bottle, perks, active, featured)
    VALUES ('pack1','Chispa',4,'Botella','[]',1,0)`);
}

describe('Birthdays: courtesies and photos', () => {
  beforeEach(async () => {
    db = await initTestDb('prisma/test_birthdays_courtesies.db');
    await ensureBirthdayTables();
    await seedPack();
    await db.$executeRawUnsafe('DELETE FROM EventLog');
  vi.resetModules();
  (global as any)._prisma = db;
  });

  it('happy path: set courtesy delivered and attach photo', async () => {
    const { createReservation, setCourtesyStatus, attachPhoto } = await import('@/lib/birthdays/service');

    const r = await createReservation({ celebrantName: 'Sofi', phone: '11', documento: '22', date: new Date('2025-10-05T00:00:00Z'), timeSlot: '19:00', packId: 'pack1', guestsPlanned: 3 });
    const courtesy = await setCourtesyStatus(r.id, 'torta', 'delivered');
    expect(courtesy.status).toBe('delivered');
    const photo = await attachPhoto(r.id, { kind: 'group', url: 'http://img', status: 'ready' });
    expect(photo.url).toBe('http://img');
    expect(photo.status).toBe('ready');
  });

  it('edge: invalid courtesy type → throws', async () => {
    const { createReservation, setCourtesyStatus } = await import('@/lib/birthdays/service');
    const r = await createReservation({ celebrantName: 'Gus', phone: '33', documento: '44', date: new Date('2025-10-06T00:00:00Z'), timeSlot: '21:00', packId: 'pack1', guestsPlanned: 2 });
    await expect(setCourtesyStatus(r.id, '   ', 'delivered')).rejects.toThrowError('INVALID_TYPE');
  });

  it('edge: idempotent courtesy update toggles status', async () => {
    const { createReservation, setCourtesyStatus } = await import('@/lib/birthdays/service');
    const r = await createReservation({ celebrantName: 'Vale', phone: '55', documento: '66', date: new Date('2025-10-07T00:00:00Z'), timeSlot: '22:00', packId: 'pack1', guestsPlanned: 4 });
    const c1 = await setCourtesyStatus(r.id, 'velitas', 'delivered');
    expect(c1.status).toBe('delivered');
    const c2 = await setCourtesyStatus(r.id, 'velitas', 'pending');
    expect(c2.id).toBe(c1.id);
    expect(c2.status).toBe('pending');
  });
});
