import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '../lib/prisma';
import { POST as markAttendance } from '../app/api/attendance/mark/route';
import { createUserSessionCookie } from '../lib/auth-user';

async function makeRequest(mode: 'IN' | 'OUT', cookie: string) {
  const body = JSON.stringify({ mode, deviceId: 'test-device' });
  return new Request('http://localhost/api/attendance/mark', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cookie': `user_session=${cookie}` },
    body
  });
}

describe('Attendance businessDay flow (cross-midnight)', () => {
  let userId: string; let personId: string; let sessionCookie: string;

  beforeAll(async () => {
    // Create isolated person (no global truncation to avoid impacting other tests)
    personId = (await prisma.$queryRawUnsafe<any[]>(`SELECT replace(hex(randomblob(16)),'','') as id`))[0].id;
    const pcode = (await prisma.$queryRawUnsafe<any[]>(`SELECT lower(hex(randomblob(6))) as c`))[0].c;
    await prisma.$executeRawUnsafe(`INSERT INTO Person (id, code, name, active, createdAt, updatedAt) VALUES ('${personId}','${pcode}','Test User ${pcode}',1, datetime('now'), datetime('now'))`);
    // Create user linked
    userId = (await prisma.$queryRawUnsafe<any[]>(`SELECT replace(hex(randomblob(16)),'','') as id`))[0].id;
    const uname = `testu_${pcode}`;
    await prisma.$executeRawUnsafe(`INSERT INTO User (id, username, passwordHash, role, personId, createdAt, updatedAt) VALUES ('${userId}','${uname}','x','COLLAB','${personId}', datetime('now'), datetime('now'))`);
    sessionCookie = await createUserSessionCookie(userId, 'COLLAB');
    // Set cutoff env (if not set)
    process.env.ATTENDANCE_CUTOFF_HOUR = '10';
    // Force business day logic path
    process.env.ATTENDANCE_BUSINESS_DAY = '1';
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('IN late evening, OUT early next morning same businessDay, later OUT fails (new day requires IN)', async () => {
    // 1) 2025-09-23T23:30:00Z (18:30 local -5) -> IN OK businessDay 2025-09-23
    vi.setSystemTime(new Date('2025-09-23T23:30:00.000Z'));
    let req = await makeRequest('IN', sessionCookie);
    let res = await markAttendance(req as unknown as Request);
    let json: any = await (res as any).json();
    expect(json.ok).toBe(true);

    // 2) 2025-09-24T06:59:00Z (01:59 local) -> OUT OK same businessDay 2025-09-23
    vi.setSystemTime(new Date('2025-09-24T06:59:00.000Z'));
    req = await makeRequest('OUT', sessionCookie);
    res = await markAttendance(req as unknown as Request);
    json = await (res as any).json();
    expect(json.ok).toBe(true);

    // 3) 2025-09-24T16:10:00Z (11:10 local) -> OUT bloqueada (nuevo businessDay sin IN)
    vi.setSystemTime(new Date('2025-09-24T16:10:00.000Z'));
    req = await makeRequest('OUT', sessionCookie);
    res = await markAttendance(req as unknown as Request);
    json = await (res as any).json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe('NO_IN_TODAY');
  });
});
