import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { initTestDb } from '@/test/setupTestDb';
import { createSessionCookie } from '@/lib/auth';

let prisma: PrismaClient;

// Helper: minimal Next-like Request mock
function mockReq(body: any, cookie?: string): any {
  const headers = new Map<string, string>();
  if (cookie) headers.set('cookie', `admin_session=${cookie}`);
  headers.set('x-forwarded-for', '127.0.0.1');
  return {
    json: async () => body,
    headers,
    url: 'http://localhost/api/scanner/scan',
  };
}

async function ensureScannerTables() {
  // Person & Scan tables for tests (SQLite)
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS Person (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS Scan (
    id TEXT PRIMARY KEY,
    personId TEXT NOT NULL,
    scannedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    type TEXT DEFAULT 'IN',
    deviceId TEXT,
    byUser TEXT,
    meta TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_scan_personId ON Scan(personId);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_scan_scannedAt ON Scan(scannedAt);`);
}

describe('Scanner code-based POST', () => {
  beforeEach(async () => {
    prisma = await initTestDb('test_scanner_code.db');
    await ensureScannerTables();
    await prisma.$executeRawUnsafe(`DELETE FROM EventLog;`);
    await prisma.$executeRawUnsafe(`DELETE FROM Scan;`);
    await prisma.$executeRawUnsafe(`DELETE FROM Person;`);
    process.env.TOKEN_SECRET = process.env.TOKEN_SECRET || 'test_secret_key';
  });

  it('accepts { code, type: "IN" } and returns ok: true', async () => {
    // Seed a person
    const nowIso = new Date().toISOString();
    await prisma.$queryRawUnsafe(
      `INSERT INTO Person (code, name, active, createdAt, updatedAt) VALUES ('EMP-TST-01', 'Test User', 1, '${nowIso}', '${nowIso}') RETURNING id`
    );

    const cookie = await createSessionCookie('ADMIN');
    // Importar la ruta después de inicializar la DB de test para usar el prisma correcto
    const scanRoute = await import('@/app/api/scanner/scan/route');
    const res = await scanRoute.POST(
      mockReq({ code: 'EMP-TST-01', type: 'IN', deviceId: 'test-suite' }, cookie)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.person?.code).toBe('EMP-TST-01');
  });
});
