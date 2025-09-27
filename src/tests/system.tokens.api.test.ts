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

function makeReq(url: string, opts: { method?: string; adminCookie?: string; userCookie?: string; body?: any } = {}): Request {
  const headers: Record<string, string> = {};
  const cookies: string[] = [];
  if (opts.adminCookie) cookies.push(`admin_session=${opts.adminCookie}`);
  if (opts.userCookie) cookies.push(`user_session=${opts.userCookie}`);
  if (cookies.length) headers['cookie'] = cookies.join('; ');
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  return new Request(url, { method: opts.method || 'GET', headers, body });
}

describe('System tokens API: status/toggle auth matrix', () => {
  beforeEach(async () => {
    const prisma = await initTestDb('prisma/test_system_tokens_api.db');
    ;(global as any)._prisma = prisma;
    await ensureCoreAuthTables(prisma);
    // Clean auth tables between tests
    try { await prisma.$executeRawUnsafe(`DELETE FROM User`);} catch {}
    try { await prisma.$executeRawUnsafe(`DELETE FROM Person`);} catch {}
    // Ensure SystemConfig exists (optional; routes handle insert if missing)
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT id FROM SystemConfig WHERE id = 1`);
      if (!rows?.length) {
        await prisma.$executeRawUnsafe(`INSERT INTO SystemConfig (id, tokensEnabled) VALUES (1, 0)`);
      }
    } catch {}
  });

  it('ADMIN → GET /status and POST /toggle are 200', async () => {
    process.env.TOKEN_SECRET = 'test_secret_tokens_api';
    const { createSessionCookie } = await import('@/lib/auth');
    const admin = await createSessionCookie('ADMIN');
    const { GET: status } = await import('@/app/api/system/tokens/status/route');
    const r1 = await status(makeReq('http://test/api/system/tokens/status', { adminCookie: admin }) as any);
    expect(r1.status).toBe(200);

    const { POST: toggle } = await import('@/app/api/system/tokens/toggle/route');
    const r2 = await toggle(makeReq('http://test/api/system/tokens/toggle', { method: 'POST', adminCookie: admin, body: { enabled: true } }) as any);
    expect(r2.status).toBe(200);
  });

  it('STAFF → GET /status 200; POST /toggle 200', async () => {
    process.env.TOKEN_SECRET = 'test_secret_tokens_api';
    const { createSessionCookie } = await import('@/lib/auth');
    const staff = await createSessionCookie('STAFF');
    const { GET: status } = await import('@/app/api/system/tokens/status/route');
    const rs = await status(makeReq('http://test/api/system/tokens/status', { adminCookie: staff }) as any);
    expect(rs.status).toBe(200);

    const { POST: toggle } = await import('@/app/api/system/tokens/toggle/route');
    const rt = await toggle(makeReq('http://test/api/system/tokens/toggle', { method: 'POST', adminCookie: staff, body: { enabled: false } }) as any);
    expect(rt.status).toBe(200);
  });
  // Caja-specific scenario removed: now cualquier STAFF puede togglear sin depender de area

  it('COLLAB only (user_session) → GET /status 401', async () => {
    process.env.TOKEN_SECRET = 'test_secret_tokens_api';
    const prisma: any = (global as any)._prisma;
    const nowIso = new Date().toISOString();
    const personId = 'p2';
    const userId = 'u2';
    await prisma.$executeRawUnsafe(
      `INSERT INTO Person (id, code, name, jobTitle, dni, area, active, createdAt, updatedAt)
       VALUES ('${personId}', '44000222', 'Collab User', NULL, '44000222', 'Mozos', 1, '${nowIso}', '${nowIso}')`
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO User (id, username, passwordHash, role, personId, createdAt, updatedAt)
       VALUES ('${userId}', 'colab', 'x', 'COLLAB', '${personId}', '${nowIso}', '${nowIso}')`
    );

    const { createUserSessionCookie } = await import('@/lib/auth-user');
    const userCookie = await createUserSessionCookie(userId, 'COLLAB');

    const { GET: status } = await import('@/app/api/system/tokens/status/route');
    const r = await status(makeReq('http://test/api/system/tokens/status', { userCookie }) as any);
    expect(r.status).toBe(401);
  });
});
