import { describe, it, expect, beforeEach } from 'vitest';
import { initTestDb } from '@/test/setupTestDb';

// Helpers to create minimal tables needed by tasks API
async function ensureTasksTables(prisma: any) {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS Person (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    passwordHash TEXT,
    personId TEXT
  );`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS Task (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    area TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);
  // Asegurar columnas recientes si la tabla ya existía sin ellas
  try {
    const info: any[] = await prisma.$queryRawUnsafe('PRAGMA table_info(Task)');
    const hasArea = info.some((c: any) => c.name === 'area');
    if (!hasArea) {
      await prisma.$executeRawUnsafe('ALTER TABLE Task ADD COLUMN area TEXT');
    }
    const hasMeasureEnabled = info.some((c: any) => c.name === 'measureEnabled');
    if (!hasMeasureEnabled) {
      await prisma.$executeRawUnsafe('ALTER TABLE Task ADD COLUMN measureEnabled INTEGER DEFAULT 0');
    }
    const hasTargetValue = info.some((c: any) => c.name === 'targetValue');
    if (!hasTargetValue) {
      await prisma.$executeRawUnsafe('ALTER TABLE Task ADD COLUMN targetValue INTEGER');
    }
    const hasUnitLabel = info.some((c: any) => c.name === 'unitLabel');
    if (!hasUnitLabel) {
      await prisma.$executeRawUnsafe('ALTER TABLE Task ADD COLUMN unitLabel TEXT');
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
  // Ensure measurement value column exists for measurable tests
  try {
    const infoPts: any[] = await prisma.$queryRawUnsafe('PRAGMA table_info(PersonTaskStatus)');
    const hasMeasureValue = infoPts.some((c: any) => c.name === 'measureValue');
    if (!hasMeasureValue) {
      await prisma.$executeRawUnsafe('ALTER TABLE PersonTaskStatus ADD COLUMN measureValue INTEGER DEFAULT 0');
    }
  } catch {}
}

async function seedBasic(prisma: any) {
  // Clear tables
  await prisma.$executeRawUnsafe('DELETE FROM PersonTaskStatus');
  await prisma.$executeRawUnsafe('DELETE FROM Task');
  await prisma.$executeRawUnsafe('DELETE FROM User');
  await prisma.$executeRawUnsafe('DELETE FROM Person');

  await prisma.$executeRawUnsafe(`INSERT INTO Person (id, code, name, active, area) VALUES ('p1','EMP-0001','Ana',1,'Barra')`);
  await prisma.$executeRawUnsafe(`INSERT INTO Person (id, code, name, active, area) VALUES ('p2','EMP-0002','Luis',1,'Mozos')`);
  await prisma.$executeRawUnsafe(`INSERT INTO User (id, username, passwordHash, personId) VALUES ('u1','ana',NULL,'p1')`);
  await prisma.$executeRawUnsafe(`INSERT INTO User (id, username, passwordHash, personId) VALUES ('u2','luis',NULL,'p2')`);
  await prisma.$executeRawUnsafe(`INSERT INTO Task (id, label, active, sortOrder, area) VALUES
    ('t1','Vestuario OK',1,10,NULL),
    ('t2','Elementos de seguridad',1,20,NULL),
    ('t3','Tarea inactiva',0,30,NULL),
    ('tb1','Revisar hieleras y vasos',1,5,'Barra'),
    ('tm1','Chequeo de bandejas',1,5,'Mozos')
  `);
}

// Utility to create a Next-like Request with cookie and optional body
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

describe('API /api/tasks (list & save)', () => {
  const day = '2025-09-12';

  beforeEach(async () => {
    // Each test gets a fresh sqlite db file
    await initTestDb('prisma/test_tasks_api.db');
    const { prisma } = await import('@/lib/prisma');
    await ensureTasksTables(prisma);
    await seedBasic(prisma);
  });

  it('happy path: list returns active tasks; save upserts statuses', async () => {
    process.env.TOKEN_SECRET = 'test_secret_tasks';
    const { createUserSessionCookie } = await import('@/lib/auth-user');
    const cookie = await createUserSessionCookie('u1', 'COLLAB');

    const { GET: listHandler } = await import('@/app/api/tasks/list/route');
    const { POST: saveHandler } = await import('@/app/api/tasks/save/route');

    // Initial list
    const res1 = await listHandler(makeReq(`http://test/api/tasks/list?day=${day}`, { cookie }) as any);
    expect(res1.status).toBe(200);
    const j1 = await res1.json();
    expect(Array.isArray(j1.tasks)).toBe(true);
  // Tareas activas: globales (t1, t2) + de su área (tb1)
  const taskIds = j1.tasks.map((t: any) => t.id).sort();
  expect(taskIds).toEqual(['t1', 't2', 'tb1']);
    expect(j1.statuses).toEqual([]);

    // Save two statuses (done true)
    const res2 = await saveHandler(makeReq('http://test/api/tasks/save', {
      method: 'POST', cookie, body: { day, items: [ { taskId: 't1', done: true }, { taskId: 't2', done: true } ] }
    }) as any);
    expect(res2.status).toBe(200);
    const j2 = await res2.json();
    expect(j2.ok).toBe(true);
    expect(j2.saved).toBe(2);

    // List again: two statuses true with updatedByUsername = 'ana'
    const res3 = await listHandler(makeReq(`http://test/api/tasks/list?day=${day}`, { cookie }) as any);
    const j3 = await res3.json();
    expect(j3.statuses.length).toBe(2);
    const map3 = Object.fromEntries(j3.statuses.map((s: any) => [s.taskId, s]));
    expect(map3['t1'].done).toBe(true);
    expect(map3['t1'].updatedByUsername).toBe('ana');
    expect(map3['t2'].done).toBe(true);

    // Upsert: toggle t2 to false
    const res4 = await saveHandler(makeReq('http://test/api/tasks/save', {
      method: 'POST', cookie, body: { day, items: [ { taskId: 't2', done: false } ] }
    }) as any);
    expect(res4.status).toBe(200);
    const j4 = await res4.json();
    expect(j4.ok).toBe(true);
    expect(j4.saved).toBe(1);

    // List third time: t1 true, t2 false
    const res5 = await listHandler(makeReq(`http://test/api/tasks/list?day=${day}`, { cookie }) as any);
    const j5 = await res5.json();
    const map5 = Object.fromEntries(j5.statuses.map((s: any) => [s.taskId, s]));
    expect(map5['t1'].done).toBe(true);
    expect(map5['t2'].done).toBe(false);
  });

  it('edge: invalid day -> 400 (list and save)', async () => {
    process.env.TOKEN_SECRET = 'test_secret_tasks';
    const { createUserSessionCookie } = await import('@/lib/auth-user');
    const cookie = await createUserSessionCookie('u1', 'COLLAB');

    const { GET: listHandler } = await import('@/app/api/tasks/list/route');
    const { POST: saveHandler } = await import('@/app/api/tasks/save/route');

    const res1 = await listHandler(makeReq('http://test/api/tasks/list?day=2025-13-40', { cookie }) as any);
    expect(res1.status).toBe(400);

    const res2 = await saveHandler(makeReq('http://test/api/tasks/save', { method: 'POST', cookie, body: { day: '2025-13-40', items: [ { taskId: 't1', done: true } ] } }) as any);
    expect(res2.status).toBe(400);
  });

  it('edge: without session -> 401 (list and save)', async () => {
    const { GET: listHandler } = await import('@/app/api/tasks/list/route');
    const { POST: saveHandler } = await import('@/app/api/tasks/save/route');

    const res1 = await listHandler(makeReq(`http://test/api/tasks/list?day=${day}`) as any);
    expect(res1.status).toBe(401);

    const res2 = await saveHandler(makeReq('http://test/api/tasks/save', { method: 'POST', body: { day, items: [ { taskId: 't1', done: true } ] } }) as any);
    expect(res2.status).toBe(401);
  });

  it('edge: empty items -> 200 with saved: 0', async () => {
    process.env.TOKEN_SECRET = 'test_secret_tasks';
    const { createUserSessionCookie } = await import('@/lib/auth-user');
    const cookie = await createUserSessionCookie('u1', 'COLLAB');
    const { POST: saveHandler } = await import('@/app/api/tasks/save/route');

    const res = await saveHandler(makeReq('http://test/api/tasks/save', { method: 'POST', cookie, body: { day, items: [] } }) as any);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.ok).toBe(true);
    expect(j.saved).toBe(0);
  });

  it('lista por área: muestra globales + del área del colaborador', async () => {
    process.env.TOKEN_SECRET = 'test_secret_tasks';
    const { createUserSessionCookie } = await import('@/lib/auth-user');
    const { GET: listHandler } = await import('@/app/api/tasks/list/route');

    // Ana es de Barra
    const cookieBarra = await createUserSessionCookie('u1', 'COLLAB');
    const resBarra = await listHandler(makeReq(`http://test/api/tasks/list?day=${day}`, { cookie: cookieBarra }) as any);
    const jBarra = await resBarra.json();
    const labelsBarra = jBarra.tasks.map((t: any) => t.label).sort();
    expect(labelsBarra).toContain('Vestuario OK');
    expect(labelsBarra).toContain('Elementos de seguridad');
    expect(labelsBarra).toContain('Revisar hieleras y vasos'); // específica de Barra
    expect(labelsBarra).not.toContain('Chequeo de bandejas'); // específica de Mozos

    // Luis es de Mozos
    const cookieMozos = await createUserSessionCookie('u2', 'COLLAB');
    const resMozos = await listHandler(makeReq(`http://test/api/tasks/list?day=${day}`, { cookie: cookieMozos }) as any);
    const jMozos = await resMozos.json();
    const labelsMozos = jMozos.tasks.map((t: any) => t.label).sort();
    expect(labelsMozos).toContain('Vestuario OK');
    expect(labelsMozos).toContain('Elementos de seguridad');
    expect(labelsMozos).toContain('Chequeo de bandejas'); // específica de Mozos
    expect(labelsMozos).not.toContain('Revisar hieleras y vasos'); // específica de Barra
  });

  it('measurable task: metadata present and save derives done by target', async () => {
    process.env.TOKEN_SECRET = 'test_secret_tasks';
    const { prisma } = await import('@/lib/prisma');
    const { createUserSessionCookie } = await import('@/lib/auth-user');
    const cookie = await createUserSessionCookie('u1', 'COLLAB');

    // Insert measurable task (global)
    await prisma.$executeRawUnsafe(
      `INSERT INTO Task (id, label, active, sortOrder, area, createdAt, updatedAt, measureEnabled, targetValue, unitLabel)
       VALUES ('tmv','Vender copas',1,15,NULL,datetime('now'),datetime('now'),1,7,'copas')`
    );

    const { GET: listHandler } = await import('@/app/api/tasks/list/route');
    const { POST: saveHandler } = await import('@/app/api/tasks/save/route');

    // List shows metadata
    const resList1 = await listHandler(makeReq(`http://test/api/tasks/list?day=${day}`, { cookie }) as any);
    expect(resList1.status).toBe(200);
    const jList1 = await resList1.json();
    const t = jList1.tasks.find((x: any) => x.id === 'tmv');
    expect(t).toBeTruthy();
    expect(t.measureEnabled).toBe(true);
    expect(t.targetValue).toBe(7);
    expect(t.unitLabel).toBe('copas');

    // Save value below target -> done=false
    const resSave1 = await saveHandler(makeReq('http://test/api/tasks/save', { method: 'POST', cookie, body: { day, items: [{ taskId: 'tmv', value: 3 }] } }) as any);
    expect(resSave1.status).toBe(200);
    const jSave1 = await resSave1.json();
    expect(jSave1.ok).toBe(true);
    expect(jSave1.saved).toBe(1);

    const resList2 = await listHandler(makeReq(`http://test/api/tasks/list?day=${day}`, { cookie }) as any);
    const jList2 = await resList2.json();
    const st2 = (jList2.statuses as any[]).find(s => s.taskId === 'tmv');
    expect(st2).toBeTruthy();
    expect(st2.done).toBe(false);
    // If measureValue column is present, the API returns value as well
    if (typeof st2.value === 'number') expect(st2.value).toBe(3);

    // Save value reaching target -> done=true
    const resSave2 = await saveHandler(makeReq('http://test/api/tasks/save', { method: 'POST', cookie, body: { day, items: [{ taskId: 'tmv', value: 7 }] } }) as any);
    expect(resSave2.status).toBe(200);
    const jSave2 = await resSave2.json();
    expect(jSave2.ok).toBe(true);
    expect(jSave2.saved).toBe(1);

    const resList3 = await listHandler(makeReq(`http://test/api/tasks/list?day=${day}`, { cookie }) as any);
    const jList3 = await resList3.json();
    const st3 = (jList3.statuses as any[]).find(s => s.taskId === 'tmv');
    expect(st3).toBeTruthy();
    expect(st3.done).toBe(true);
    if (typeof st3.value === 'number') expect(st3.value).toBe(7);
  });
});
