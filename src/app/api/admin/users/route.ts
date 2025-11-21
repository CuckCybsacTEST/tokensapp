export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie, requireRole, type UserRole } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { ALLOWED_AREAS as AREAS_ALLOWED, isValidArea } from '@/lib/areas';
import { parseBirthdayInput, formatBirthdayLabel } from '@/lib/birthday';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const normalizeDni = (s: string) => String(s || '').replace(/\D+/g, '');

export async function GET(req: Request) {
  try {
    const raw = getUserSessionCookieFromRequest(req);
    const session = await verifyUserSessionCookie(raw);
    if (!session || !['ADMIN', 'STAFF'].includes(session.role)) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

    const users = await prisma.user.findMany({
      orderBy: { person: { code: 'asc' } },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        person: { select: { code: true, name: true, dni: true, area: true, jobTitle: true, whatsapp: true, birthday: true } },
      },
    });
    const rows = users.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
      personCode: u.person?.code ?? null,
      personName: u.person?.name ?? null,
      dni: u.person?.dni ?? null,
      area: u.person?.area ?? null,
      jobTitle: u.person?.jobTitle ?? null,
      whatsapp: u.person?.whatsapp ?? null,
  birthday: u.person?.birthday ? formatBirthdayLabel(u.person?.birthday) : null,
    }));
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

function normalizeWhatsapp(raw: string) {
  return String(raw || '').replace(/\D+/g, '');
}
function isValidWhatsapp(raw: string) {
  const n = normalizeWhatsapp(raw);
  return n.length >= 8 && n.length <= 15; // rango genérico
}
// parseBirthday reemplazado por util parseBirthdayInput

async function generateNextPersonCode(): Promise<string> {
  // Default prefix EMP- and 4-digit padding
  const prefix = 'EMP-';
  const like = `${prefix}%`;
  const people = await prisma.person.findMany({ where: { code: { startsWith: prefix } }, select: { code: true } });
  let maxNum = 0;
  for (const p of people) {
    const m = p.code?.slice(prefix.length) || '';
    const n = parseInt(m, 10);
    if (!isNaN(n) && n > maxNum) maxNum = n;
  }
  const next = maxNum + 1;
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
  const exists = await prisma.person.findUnique({ where: { code: initial }, select: { id: true } });
  if (!exists) return initial;
  // try suffixed variants -2..-9
  for (let i = 2; i <= 9; i++) {
    const variant = `${initial}-${i}`;
    const row = await prisma.person.findUnique({ where: { code: variant }, select: { id: true } });
    if (!row) return variant.length <= 40 ? variant : variant.slice(0, 40);
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
  const incCheck = await prisma.person.findUnique({ where: { code: inc }, select: { id: true } });
  if (!incCheck) return inc;
  // Final fallback: EMP-<random4>
  for (let tries = 0; tries < 10; tries++) {
    const r = randomBytes(2).toString('hex').toUpperCase();
    const candidate = `EMP-${r}`;
    const row = await prisma.person.findUnique({ where: { code: candidate }, select: { id: true } });
    if (!row) return candidate;
  }
  // As a last resort, return inc even if duplicate (very unlikely to reach here with above checks)
  return inc;
}

export async function POST(req: Request) {
  try {
    const raw = getUserSessionCookieFromRequest(req);
    const session = await verifyUserSessionCookie(raw);
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body || !body.username || !body.password) {
      return NextResponse.json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });
    }

    const username = String(body.username).trim();
    const password = String(body.password);
    // Valid roles: only the three system roles
    const validRoles: UserRole[] = ['ADMIN', 'STAFF', 'COLLAB'];
    const role: UserRole = validRoles.includes(body.role as UserRole) ? (body.role as UserRole) : 'COLLAB';

    if (!isValidUsername(username)) {
      return NextResponse.json({ ok: false, code: 'INVALID_USERNAME' }, { status: 400 });
    }
    if (!isValidPassword(password)) {
      return NextResponse.json({ ok: false, code: 'INVALID_PASSWORD' }, { status: 400 });
    }

    // Link path: provide code (DNI-normalized) without person object → attach new User to existing Person
    if (body.code && !body.person) {
      const rawCode = String(body.code).trim();
      // Normalize similar to DNI (digits only) because creation path forces code = normalized DNI
      const normalized = normalizeDni(rawCode) || rawCode.replace(/\W+/g, '');
      if (!normalized) {
        return NextResponse.json({ ok: false, code: 'INVALID_CODE' }, { status: 400 });
      }
      // Check username uniqueness
      const existingUser = await prisma.user.findUnique({ where: { username }, select: { id: true } });
      if (existingUser) {
        return NextResponse.json({ ok: false, code: 'USERNAME_TAKEN' }, { status: 409 });
      }
      const prow = await prisma.person.findUnique({ where: { code: normalized }, select: { id: true, code: true } });
      if (!prow) {
        return NextResponse.json({ ok: false, code: 'CODE_NOT_FOUND' }, { status: 400 });
      }
      const personId = prow.id as string;
      // Ensure not already linked
      const linked = await prisma.user.findUnique({ where: { personId }, select: { id: true } });
      if (linked) {
        return NextResponse.json({ ok: false, code: 'ALREADY_LINKED' }, { status: 409 });
      }
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password, salt);
      const created = await prisma.user.create({ data: { username, passwordHash, role, personId }, select: { id: true } });
      const userId = created.id as string;
      return NextResponse.json({ ok: true, user: { id: userId, username, role, personCode: normalized } }, { status: 200 });
    }

    // Create Person + User transactionally (mandatory path)
    const personInput = body.person || {};
    const name = typeof personInput.name === 'string' ? personInput.name.trim() : '';
    const dniRaw = typeof personInput.dni === 'string' ? personInput.dni.trim() : '';
    const dni = normalizeDni(dniRaw);
    const area = typeof personInput.area === 'string' ? personInput.area.trim() : null;
    const whatsappRaw = typeof personInput.whatsapp === 'string' ? personInput.whatsapp.trim() : '';
    const birthdayRaw = typeof personInput.birthday === 'string' ? personInput.birthday.trim() : '';
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
    if (!isValidWhatsapp(whatsappRaw)) {
      return NextResponse.json({ ok: false, code: 'INVALID_WHATSAPP' }, { status: 400 });
    }
  const birthdayDate = parseBirthdayInput(birthdayRaw);
    if (!birthdayDate) {
      return NextResponse.json({ ok: false, code: 'INVALID_BIRTHDAY' }, { status: 400 });
    }
    // Force code = normalized DNI
    code = dni.toUpperCase();

    // Pre-checks for uniqueness
    const [uExists, dniExists, codeExists] = await Promise.all([
      prisma.user.findUnique({ where: { username }, select: { id: true } }),
      prisma.person.findUnique({ where: { dni }, select: { id: true } }),
      prisma.person.findUnique({ where: { code: code! }, select: { id: true } }),
    ]);
    if (uExists) {
      return NextResponse.json({ ok: false, code: 'USERNAME_TAKEN' }, { status: 409 });
    }
    if (dniExists) {
      return NextResponse.json({ ok: false, code: 'DNI_TAKEN' }, { status: 409 });
    }
    if (codeExists) {
      return NextResponse.json({ ok: false, code: 'CODE_TAKEN' }, { status: 409 });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const created = await prisma.$transaction(async (tx) => {
      const createdPerson = await tx.person.create({ data: { code: code!, name, dni, area, active: true, whatsapp: normalizeWhatsapp(whatsappRaw), birthday: birthdayDate } });
      const createdUser = await tx.user.create({ data: { username, passwordHash, role, personId: createdPerson.id } });
      return { personId: createdPerson.id, userId: createdUser.id };
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
