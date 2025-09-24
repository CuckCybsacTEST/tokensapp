import { describe, it, expect, beforeEach } from 'vitest';
import { initTestDb } from '@/test/setupTestDb';

async function ensureCoreTables(prisma: any) {
  // Person and User as used by the routes
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
  // Tasks for the BYOD flow validation
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS Task (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);
  // Ensure 'area' column exists for filtering tasks by area
  try {
    const info: any[] = await prisma.$queryRawUnsafe(`PRAGMA table_info(Task)`);
    const hasArea = Array.isArray(info) && info.some((c: any) => String(c.name).toLowerCase() === 'area');
    if (!hasArea) {
      await prisma.$executeRawUnsafe(`ALTER TABLE Task ADD COLUMN area TEXT`);
    }
  } catch {}
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS PersonTaskStatus (
    id TEXT PRIMARY KEY,
    personId TEXT NOT NULL,
    taskId TEXT NOT NULL,
    day TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    updatedBy TEXT,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(personId, taskId, day)
  );`);
}

function makeAdminReq(url: string, cookie: string, body?: any): Request {
  const headers: Record<string, string> = { 'cookie': `admin_session=${cookie}` };
  let b: BodyInit | undefined;
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    b = JSON.stringify(body);
  }
  return new Request(url, { method: 'POST', headers, body: b });
}

function makeReq(url: string, opts: { method?: string; cookie?: string; body?: any } = {}): Request {
  const headers: Record<string, string> = {};
  if (opts.cookie) headers['cookie'] = `user_session=${opts.cookie}`;
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  return new Request(url, { method: opts.method || 'GET', headers, body });
}

describe('API /api/admin/users (nuevas reglas: área fija y código = DNI)', () => {
  beforeEach(async () => {
    // Fresh DB per test
    const prisma = await initTestDb('prisma/test_admin_users_api.db');
    ;(global as any)._prisma = prisma;
    await ensureCoreTables(prisma);
    // Cleanup to avoid unique collisions across tests
    await prisma.$executeRawUnsafe(`DELETE FROM PersonTaskStatus`);
    await prisma.$executeRawUnsafe(`DELETE FROM User`);
    await prisma.$executeRawUnsafe(`DELETE FROM Person`);
    // seed one active task to validate tasks/list later
    await prisma.$executeRawUnsafe(`DELETE FROM Task`);
    await prisma.$executeRawUnsafe(`INSERT INTO Task (id, label, active, sortOrder) VALUES ('t1','Checklist básica',1,10)`);
  });

  it('happy path: create con DNI con puntos/guiones → guarda solo dígitos en dni y code; luego BYOD login y tasks/list OK', async () => {
    process.env.TOKEN_SECRET = 'test_secret_admin_users';
    const { createSessionCookie } = await import('@/lib/auth');
    const adminCookie = await createSessionCookie('ADMIN');
    const { POST: createUser } = await import('@/app/api/admin/users/route');

    // Crear usuario + persona (área permitida) con DNI con puntos
    const res = await createUser(makeAdminReq('http://test/api/admin/users', adminCookie, {
      username: 'maria',
      password: 'maria-strong-1',
      role: 'COLLAB',
      person: { name: 'María Lopez', dni: '33.000.111', area: 'Barra' }
    }) as any);
    expect(res.status).toBe(201);
    const j = await res.json();
    expect(j.ok).toBe(true);
    expect(j.user.username).toBe('maria');
  expect(j.person.dni).toBe('33000111');
  expect(j.person.code).toBe('33000111');

    // BYOD login with the created credentials
    const { POST: userLogin } = await import('@/app/api/user/auth/login/route');
    const loginRes = await userLogin(new Request('http://test/api/user/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'maria', password: 'maria-strong-1' })
    }) as any);
    expect(loginRes.status).toBe(200);
    const setCookie = loginRes.headers.get('set-cookie') || '';
    const cookie = setCookie.split(';')[0];
    const token = cookie.split('=')[1];
    expect(token && token.length > 10).toBe(true);

    // Access tasks/list with the session cookie
    const day = '2025-09-12';
    const { GET: listTasks } = await import('@/app/api/tasks/list/route');
    const listRes = await listTasks(makeReq(`http://test/api/tasks/list?day=${day}`, { cookie: token }) as any);
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    expect(Array.isArray(listJson.tasks)).toBe(true);
    expect(listJson.tasks.length).toBe(1);
    expect(listJson.tasks[0].label).toBe('Checklist básica');
  });

  it('área inválida: devuelve 400 INVALID_AREA', async () => {
    process.env.TOKEN_SECRET = 'test_secret_admin_users';
    const { createSessionCookie } = await import('@/lib/auth');
    const adminCookie = await createSessionCookie('ADMIN');
    const { POST: createUser } = await import('@/app/api/admin/users/route');

    const r = await createUser(makeAdminReq('http://test/api/admin/users', adminCookie, {
      username: 'pepe', password: 'pepe-strong-1', person: { name: 'Pepe', dni: '30111222', area: 'Ventas' }
    }) as any);
    expect(r.status).toBe(400);
    const j = await r.json();
    expect(j.code).toBe('INVALID_AREA');
  });

  it('dni duplicado: devuelve 409 DNI_TAKEN', async () => {
    process.env.TOKEN_SECRET = 'test_secret_admin_users';
    const { createSessionCookie } = await import('@/lib/auth');
    const adminCookie = await createSessionCookie('ADMIN');
    const { POST: createUser } = await import('@/app/api/admin/users/route');

    const r1 = await createUser(makeAdminReq('http://test/api/admin/users', adminCookie, {
      username: 'ana', password: 'ana-strong-1', person: { name: 'Ana', dni: '30.111.222', area: 'Mozos' }
    }) as any);
    expect(r1.status).toBe(201);

    const r2 = await createUser(makeAdminReq('http://test/api/admin/users', adminCookie, {
      username: 'ana2', password: 'ana2-strong-1', person: { name: 'Ana Dos', dni: '30111222', area: 'Barra' }
    }) as any);
    expect(r2.status).toBe(409);
    const j2 = await r2.json();
    expect(j2.code).toBe('DNI_TAKEN');
  });

  it('link: ingresando un DNI como código (normalizado) vincula correctamente', async () => {
    process.env.TOKEN_SECRET = 'test_secret_admin_users';
    const { createSessionCookie } = await import('@/lib/auth');
    const adminCookie = await createSessionCookie('ADMIN');
    const { POST: postAdminUsers } = await import('@/app/api/admin/users/route');

    // Crear persona preexistente sin usuario, con code = '12345678'
    const prisma: any = (global as any)._prisma;
    const nowIso = new Date().toISOString();
    await prisma.$queryRawUnsafe(
      `INSERT INTO Person (code, name, jobTitle, dni, area, active, createdAt, updatedAt)
       VALUES ('12345678', 'Persona Link', NULL, '12345678', 'Barra', 1, '${nowIso}', '${nowIso}') RETURNING id`
    );

    const res = await postAdminUsers(makeAdminReq('http://test/api/admin/users', adminCookie, {
      username: 'linkuser', password: 'linkuser-strong-1', code: '12.345.678'
    }) as any);
    expect(res.status).toBe(200);
    const jj = await res.json();
    expect(jj.ok).toBe(true);
    expect(jj.user.personCode).toBe('12345678');
  });
});
