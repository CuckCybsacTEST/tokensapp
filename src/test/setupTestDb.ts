import { PrismaClient } from "@prisma/client";

const CREATE_STATEMENTS = [
  // SystemConfig current shape (no test/admin flags)
  `CREATE TABLE IF NOT EXISTS SystemConfig (id INTEGER PRIMARY KEY, tokensEnabled INTEGER NOT NULL, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS Prize (id TEXT PRIMARY KEY, key TEXT UNIQUE, label TEXT NOT NULL, color TEXT, description TEXT, stock INTEGER, active INTEGER DEFAULT 1, emittedTotal INTEGER NOT NULL DEFAULT 0, lastEmittedAt DATETIME, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP);`,
  `CREATE TABLE IF NOT EXISTS Batch (id TEXT PRIMARY KEY, description TEXT, createdBy TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP);`,
  // Token table extended with two-phase columns (revealedAt, assignedPrizeId, deliveredAt, deliveredByUserId, deliveryNote)
  `CREATE TABLE IF NOT EXISTS Token (id TEXT PRIMARY KEY, prizeId TEXT NOT NULL, batchId TEXT NOT NULL, expiresAt DATETIME NOT NULL, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, redeemedAt DATETIME, signature TEXT NOT NULL, signatureVersion INTEGER DEFAULT 1, disabled INTEGER DEFAULT 0, revealedAt DATETIME, assignedPrizeId TEXT, deliveredAt DATETIME, deliveredByUserId TEXT, deliveryNote TEXT);`,
  `CREATE TABLE IF NOT EXISTS EventLog (id TEXT PRIMARY KEY, type TEXT NOT NULL, message TEXT, metadata TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP);`,
  // Print template table used by print-control tests
  `CREATE TABLE IF NOT EXISTS PrintTemplate (id TEXT PRIMARY KEY, name TEXT NOT NULL, filePath TEXT NOT NULL, meta TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP);`,
  // Roulette tables (simplified subset of prisma schema; keep columns referenced in code/tests)
  `CREATE TABLE IF NOT EXISTS RouletteSession (id TEXT PRIMARY KEY, batchId TEXT NOT NULL, mode TEXT DEFAULT 'BY_PRIZE', status TEXT DEFAULT 'ACTIVE', spins INTEGER DEFAULT 0, maxSpins INTEGER, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, finishedAt DATETIME, meta TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS RouletteSpin (id TEXT PRIMARY KEY, sessionId TEXT NOT NULL, prizeId TEXT NOT NULL, tokenId TEXT, weightSnapshot INTEGER NOT NULL, "order" INTEGER NOT NULL, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP);`,
];

export async function initTestDb(file: string) {
  process.env.DATABASE_URL = `file:./${file}?connection_limit=1`;
  const prisma = new PrismaClient();
  // PRAGMA foreign_keys eliminado (era para SQLite). TODO: cuando se usen tests sobre Postgres real, implementar estrategia de truncates.
  for (const stmt of CREATE_STATEMENTS) {
    await prisma.$executeRawUnsafe(stmt);
  }
  // Ensure new columns added even if table existed from a previous run (in case of schema drift)
  try {
    const pragma: any[] = await prisma.$queryRawUnsafe("PRAGMA table_info(Prize)");
    const hasEmittedTotal = pragma.some((c) => c.name === "emittedTotal");
    if (!hasEmittedTotal) {
      await prisma.$executeRawUnsafe(
        "ALTER TABLE Prize ADD COLUMN emittedTotal INTEGER NOT NULL DEFAULT 0"
      );
    }
    const hasLastEmittedAt = pragma.some((c) => c.name === "lastEmittedAt");
    if (!hasLastEmittedAt) {
      await prisma.$executeRawUnsafe("ALTER TABLE Prize ADD COLUMN lastEmittedAt DATETIME");
    }
    // SystemConfig flags removed; no extra columns to ensure
    // Ensure Token has two-phase columns
    try {
      const tk: any[] = await prisma.$queryRawUnsafe("PRAGMA table_info(Token)");
      const needAlter = [] as string[];
      if (!tk.some((c) => c.name === "revealedAt")) needAlter.push("ALTER TABLE Token ADD COLUMN revealedAt DATETIME");
      if (!tk.some((c) => c.name === "assignedPrizeId")) needAlter.push("ALTER TABLE Token ADD COLUMN assignedPrizeId TEXT");
      if (!tk.some((c) => c.name === "deliveredAt")) needAlter.push("ALTER TABLE Token ADD COLUMN deliveredAt DATETIME");
      if (!tk.some((c) => c.name === "deliveredByUserId")) needAlter.push("ALTER TABLE Token ADD COLUMN deliveredByUserId TEXT");
      if (!tk.some((c) => c.name === "deliveryNote")) needAlter.push("ALTER TABLE Token ADD COLUMN deliveryNote TEXT");
      for (const a of needAlter) await prisma.$executeRawUnsafe(a);
    } catch {
      /* ignore */
    }
  } catch {
    // swallow
  }

  // Ensure Person has dni and area + unique index on dni (idempotent)
  try {
    const personInfo: any[] = await prisma.$queryRawUnsafe("PRAGMA table_info(Person)");
    const hasDni = personInfo.some((c: any) => c.name === 'dni');
    const hasArea = personInfo.some((c: any) => c.name === 'area');
    if (!hasDni) {
      await prisma.$executeRawUnsafe(`ALTER TABLE Person ADD COLUMN dni TEXT`);
    }
    if (!hasArea) {
      await prisma.$executeRawUnsafe(`ALTER TABLE Person ADD COLUMN area TEXT`);
    }
    // Create unique index if not exists: SQLite supports IF NOT EXISTS in CREATE INDEX
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS Person_dni_key ON Person(dni)`);
  } catch {
    // ignore if table doesn't exist yet in some test suites; they may create later
  }
  return prisma;
}

export async function initTestDbMulti(file: string, connectionLimit = 5) {
  process.env.DATABASE_URL = `file:./${file}?connection_limit=${connectionLimit}`;
  const prisma = new PrismaClient();
  // PRAGMA foreign_keys eliminado. TODO: migrar a un helper de truncates al usar Postgres.
  for (const stmt of CREATE_STATEMENTS) {
    await prisma.$executeRawUnsafe(stmt);
  }
  // Reuse column drift adjustments
  try {
    const pragma: any[] = await prisma.$queryRawUnsafe("PRAGMA table_info(Prize)");
    const hasEmittedTotal = pragma.some((c) => c.name === "emittedTotal");
    if (!hasEmittedTotal) {
      await prisma.$executeRawUnsafe("ALTER TABLE Prize ADD COLUMN emittedTotal INTEGER NOT NULL DEFAULT 0");
    }
    const hasLastEmittedAt = pragma.some((c) => c.name === "lastEmittedAt");
    if (!hasLastEmittedAt) {
      await prisma.$executeRawUnsafe("ALTER TABLE Prize ADD COLUMN lastEmittedAt DATETIME");
    }
  } catch {
    // swallow
  }
  return prisma;
}
