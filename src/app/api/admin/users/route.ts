import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { ALLOWED_AREAS as AREAS_ALLOWED, isValidArea } from '@/lib/areas';

const esc = (s: string) => s.replace(/'/g, "''");
const normalizeDni = (s: string) => String(s || '').replace(/\D+/g, '');

export async function GET(req: Request) {
  try {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const ok = requireRole(session, ['ADMIN']);
  if (!ok.ok) return NextResponse.json({ ok: false, code: ok.error || 'UNAUTHORIZED' }, { status: 401 });

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT u.id as id, u.username as username, u.role as role, u.createdAt as createdAt,
              p.code as personCode, p.name as personName, p.dni as dni, p.area as area, p.jobTitle as jobTitle
         FROM User u
         JOIN Person p ON p.id = u.personId
        ORDER BY p.code ASC`
    );
    return NextResponse.json({ ok: true, users: rows });
  } catch (e: any) {
    console.error('admin list users error', e);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}

function isValidUsername(s: string) {
  if (!s) return false;
  const trimmed = s.trim();
  if (trimmed.length < 3 || trimmed.length > 50) return false;
  return /^[A-Za-z0-9_.\-]+$/.test(trimmed);
}

function isValidPassword(pw: string) {
  return typeof pw === 'string' && pw.length >= 8;
}

function isValidName(n: string) {
  if (!n) return false;
  const t = n.trim();
  return t.length >= 2 && t.length <= 120;
}

function isValidCode(c: string) {
  const t = c.trim();
  return t.length >= 3 && t.length <= 40 && /^[A-Za-z0-9_.\-]+$/.test(t);
}

async function generateNextPersonCode(): Promise<string> {
  // Default prefix EMP- and 4-digit padding
  const prefix = 'EMP-';
  const row: Array<{ maxNum: number | null }> = await prisma.$queryRawUnsafe(
    `SELECT MAX(CAST(substr(code, ${prefix.length + 1}) AS INTEGER)) as maxNum FROM Person WHERE code LIKE '${esc(prefix)}%'`
  );
  const next = ((row?.[0]?.maxNum || 0) as number) + 1;
  const padded = String(next).padStart(4, '0');
  return `${prefix}${padded}`;
}

function buildCodeFromDni(dni: string): string | null {
  if (!dni) return null;
  const base = String(dni).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!base) return null;
  const prefix = 'EMP-';
  const candidate = `${prefix}${base}`;
  return candidate.length <= 40 ? candidate : candidate.slice(0, 40);
}

async function ensureUniqueCode(initial: string | null): Promise<string | null> {
  if (!initial) return null;
  const exists: any[] = await prisma.$queryRawUnsafe(`SELECT id FROM Person WHERE code='${esc(initial)}' LIMIT 1`);
  if (!exists || exists.length === 0) return initial;
  // try suffixed variants -2..-9
  for (let i = 2; i <= 9; i++) {
    const variant = `${initial}-${i}`;
    const row: any[] = await prisma.$queryRawUnsafe(`SELECT id FROM Person WHERE code='${esc(variant)}' LIMIT 1`);
    if (!row || row.length === 0) return variant.length <= 40 ? variant : variant.slice(0, 40);
  }
  return null;
}

async function generateAutoCodeFromDniOrFallback(dni: string): Promise<string> {
  // Try EMP-<DNI>
  const fromDni = buildCodeFromDni(dni);
  const uniqueFromDni = await ensureUniqueCode(fromDni);
  if (uniqueFromDni) return uniqueFromDni;
  // Fallback: incremental EMP-0001...
  const inc = await generateNextPersonCode();
  const incCheck: any[] = await prisma.$queryRawUnsafe(`SELECT id FROM Person WHERE code='${esc(inc)}' LIMIT 1`);
  if (!incCheck || incCheck.length === 0) return inc;
  // Final fallback: EMP-<random4>
  for (let tries = 0; tries < 10; tries++) {
    const r = randomBytes(2).toString('hex').toUpperCase();
    const candidate = `EMP-${r}`;
    const row: any[] = await prisma.$queryRawUnsafe(`SELECT id FROM Person WHERE code='${esc(candidate)}' LIMIT 1`);
    if (!row || row.length === 0) return candidate;
  }
  // As a last resort, return inc even if duplicate (very unlikely to reach here with above checks)
  return inc;
}

export async function POST(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const ok = requireRole(session, ['ADMIN', 'STAFF']);
    if (!ok.ok) return NextResponse.json({ ok: false, code: ok.error || 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body || !body.username || !body.password) {
      return NextResponse.json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });
    }

    const username = String(body.username).trim();
    const password = String(body.password);
    // Role defaults to COLLAB; allow STAFF explicitly if passed, otherwise ignore
    const role = (body.role === 'STAFF' ? 'STAFF' : 'COLLAB') as 'COLLAB' | 'STAFF';

    if (!isValidUsername(username)) {
      return NextResponse.json({ ok: false, code: 'INVALID_USERNAME' }, { status: 400 });
    }
    if (!isValidPassword(password)) {
      return NextResponse.json({ ok: false, code: 'INVALID_PASSWORD' }, { status: 400 });
    }

    // Create Person + User transactionally (mandatory path)
    const personInput = body.person || {};
    const name = typeof personInput.name === 'string' ? personInput.name.trim() : '';
  const dniRaw = typeof personInput.dni === 'string' ? personInput.dni.trim() : '';
  const dni = normalizeDni(dniRaw);
  const area = typeof personInput.area === 'string' ? personInput.area.trim() : null;
  // Ignore incoming jobTitle and code per new rules
  let code: string | null = null;

    if (!isValidName(name)) {
      return NextResponse.json({ ok: false, code: 'INVALID_NAME' }, { status: 400 });
    }
    if (!dni) {
      return NextResponse.json({ ok: false, code: 'INVALID_DNI' }, { status: 400 });
    }
    if (!area || !isValidArea(area)) {
      return NextResponse.json({ ok: false, code: 'INVALID_AREA' }, { status: 400 });
    }
    // Force code = normalized DNI
    code = dni.toUpperCase();

    // Pre-checks for uniqueness
    const [uExists, dniExists, codeExists] = (await Promise.all([
      prisma.$queryRawUnsafe(`SELECT id FROM User WHERE username='${esc(username)}' LIMIT 1`),
      prisma.$queryRawUnsafe(`SELECT id FROM Person WHERE dni='${esc(dni)}' LIMIT 1`),
      prisma.$queryRawUnsafe(`SELECT id FROM Person WHERE code='${esc(code)}' LIMIT 1`),
    ])) as [any[], any[], any[]];
    if (uExists && uExists.length) {
      return NextResponse.json({ ok: false, code: 'USERNAME_TAKEN' }, { status: 409 });
    }
    if (dniExists && dniExists.length) {
      return NextResponse.json({ ok: false, code: 'DNI_TAKEN' }, { status: 409 });
    }
    if (codeExists && codeExists.length) {
      return NextResponse.json({ ok: false, code: 'CODE_TAKEN' }, { status: 409 });
    }

    const nowIso = new Date().toISOString();
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    let created: { personId: string; userId: string } = { personId: '', userId: '' };

    await prisma.$transaction(async (tx) => {
      // Insert Person
      await tx.$executeRawUnsafe(
        `INSERT INTO Person (id, code, name, jobTitle, dni, area, active, createdAt, updatedAt)
         VALUES (replace(hex(randomblob(16)),'',''), '${esc(code!)}', '${esc(name)}', NULL, '${esc(dni)}', '${esc(area)}', 1, '${nowIso}', '${nowIso}')`
      );
      const prow: any[] = await tx.$queryRawUnsafe(`SELECT id FROM Person WHERE code='${esc(code!)}' LIMIT 1`);
      const personId = prow?.[0]?.id as string;
      if (!personId) throw new Error('FAILED_TO_CREATE_PERSON');

      // Insert User
      await tx.$executeRawUnsafe(
        `INSERT INTO User (id, username, passwordHash, role, personId, createdAt, updatedAt)
         VALUES (replace(hex(randomblob(16)),'',''), '${esc(username)}', '${esc(passwordHash)}', '${role}', '${esc(personId)}', '${nowIso}', '${nowIso}')`
      );
      const urow: any[] = await tx.$queryRawUnsafe(`SELECT id FROM User WHERE username='${esc(username)}' LIMIT 1`);
      const userId = urow?.[0]?.id as string;
      if (!userId) throw new Error('FAILED_TO_CREATE_USER');

      created = { personId, userId };
    });

  return NextResponse.json({ ok: true, user: { id: created.userId, username, role }, person: { id: created.personId, code, name, dni, area } }, { status: 201 });
  } catch (e: any) {
    // Attempt to map known unique constraint failures if they slipped past pre-checks
    const msg = String(e?.message || e || '');
    if (msg.includes('UNIQUE') && msg.includes('User') && msg.includes('username')) {
      return NextResponse.json({ ok: false, code: 'USERNAME_TAKEN' }, { status: 409 });
    }
    if (msg.includes('UNIQUE') && msg.includes('Person') && msg.includes('dni')) {
      return NextResponse.json({ ok: false, code: 'DNI_TAKEN' }, { status: 409 });
    }
    if (msg.includes('UNIQUE') && msg.includes('Person') && msg.includes('code')) {
      return NextResponse.json({ ok: false, code: 'CODE_TAKEN' }, { status: 409 });
    }
    console.error('admin create user error', e);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
