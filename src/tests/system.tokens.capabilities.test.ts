// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import { initTestDb } from '@/test/setupTestDb';

async function ensureCoreAuthTables(prisma: any) {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS Person (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    jobTitle TEXT,
    dni TEXT UNIQUE,
    area TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    passwordHash TEXT NOT NULL,
    role TEXT DEFAULT 'COLLAB',
    personId TEXT UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);
}

function makeReq(url: string, opts: { adminCookie?: string; userCookie?: string } = {}): Request {
  const headers: Record<string, string> = {};
  const cookies: string[] = [];
  if (opts.adminCookie) cookies.push(`admin_session=${opts.adminCookie}`);
  if (opts.userCookie) cookies.push(`user_session=${opts.userCookie}`);
  if (cookies.length) headers['cookie'] = cookies.join('; ');
  return new Request(url, { method: 'GET', headers });
}

describe('System tokens capabilities: canView/canToggle matrix', () => {
  beforeEach(async () => {
    const prisma = await initTestDb('prisma/test_system_tokens_caps.db');
    ;(global as any)._prisma = prisma;
    await ensureCoreAuthTables(prisma);
    try { await prisma.$executeRawUnsafe(`DELETE FROM User`);} catch {}
    try { await prisma.$executeRawUnsafe(`DELETE FROM Person`);} catch {}
  });

  it('ADMIN → canView=true, canToggle=true', async () => {
    process.env.TOKEN_SECRET = 'test_secret_tokens_caps';
    const { createSessionCookie } = await import('@/lib/auth');
    const admin = await createSessionCookie('ADMIN');
    const { GET: caps } = await import('@/app/api/system/tokens/capabilities/route');
    const r = await caps(makeReq('http://test/api/system/tokens/capabilities', { adminCookie: admin }) as any);
    expect(r.status).toBe(200);
    const json = await r.json();
    expect(json.canView).toBe(true);
    expect(json.canToggle).toBe(true);
  });

  it('STAFF (no user_session) → canView=true, canToggle=false', async () => {
    process.env.TOKEN_SECRET = 'test_secret_tokens_caps';
    const { createSessionCookie } = await import('@/lib/auth');
    const staff = await createSessionCookie('STAFF');
    const { GET: caps } = await import('@/app/api/system/tokens/capabilities/route');
    const r = await caps(makeReq('http://test/api/system/tokens/capabilities', { adminCookie: staff }) as any);
    expect(r.status).toBe(200);
    const json = await r.json();
    expect(json.canView).toBe(true);
    expect(json.canToggle).toBe(false);
  });

  it('STAFF + user_session STAFF (Caja) → canToggle=true', async () => {
    process.env.TOKEN_SECRET = 'test_secret_tokens_caps';
    const prisma: any = (global as any)._prisma;
    const nowIso = new Date().toISOString();
    const personId = 'p1';
    const userId = 'u1';
    await prisma.$executeRawUnsafe(
      `INSERT INTO Person (id, code, name, jobTitle, dni, area, active, createdAt, updatedAt)
       VALUES ('${personId}', '99990001', 'Martin Vizcarra', NULL, '99990001', 'Caja', 1, '${nowIso}', '${nowIso}')`
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO User (id, username, passwordHash, role, personId, createdAt, updatedAt)
       VALUES ('${userId}', 'martin', 'x', 'STAFF', '${personId}', '${nowIso}', '${nowIso}')`
    );

    const { createSessionCookie } = await import('@/lib/auth');
    const { createUserSessionCookie } = await import('@/lib/auth-user');
    const staff = await createSessionCookie('STAFF');
    const userCookie = await createUserSessionCookie(userId, 'STAFF');
    const { GET: caps } = await import('@/app/api/system/tokens/capabilities/route');
    const r = await caps(makeReq('http://test/api/system/tokens/capabilities', { adminCookie: staff, userCookie }) as any);
    expect(r.status).toBe(200);
    const json = await r.json();
    expect(json.canView).toBe(true);
    expect(json.canToggle).toBe(true);
  });

  it('STAFF + user_session COLLAB or non-Caja → canToggle=false', async () => {
    process.env.TOKEN_SECRET = 'test_secret_tokens_caps';
    const prisma: any = (global as any)._prisma;
    const nowIso = new Date().toISOString();
    const personId = 'p2';
    const userId = 'u2';
    await prisma.$executeRawUnsafe(
      `INSERT INTO Person (id, code, name, jobTitle, dni, area, active, createdAt, updatedAt)
       VALUES ('${personId}', '99990002', 'Otro User', NULL, '99990002', 'Mozos', 1, '${nowIso}', '${nowIso}')`
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO User (id, username, passwordHash, role, personId, createdAt, updatedAt)
       VALUES ('${userId}', 'otro', 'x', 'COLLAB', '${personId}', '${nowIso}', '${nowIso}')`
    );

    const { createSessionCookie } = await import('@/lib/auth');
    const { createUserSessionCookie } = await import('@/lib/auth-user');
    const staff = await createSessionCookie('STAFF');
    const userCookie = await createUserSessionCookie(userId, 'COLLAB');
    const { GET: caps } = await import('@/app/api/system/tokens/capabilities/route');
    const r = await caps(makeReq('http://test/api/system/tokens/capabilities', { adminCookie: staff, userCookie }) as any);
    expect(r.status).toBe(200);
    const json = await r.json();
    expect(json.canView).toBe(true);
    expect(json.canToggle).toBe(false);
  });

  it('user_session only (sin admin_session) → 403', async () => {
    process.env.TOKEN_SECRET = 'test_secret_tokens_caps';
    const { GET: caps } = await import('@/app/api/system/tokens/capabilities/route');
    const r = await caps(makeReq('http://test/api/system/tokens/capabilities', { userCookie: 'whatever' }) as any);
    expect(r.status).toBe(403);
  });
});
