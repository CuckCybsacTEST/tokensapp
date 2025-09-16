import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';

function esc(s: string) { return s.replace(/'/g, "''"); }

export async function POST(req: Request) {
  try {
    // Authn + Authz
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const role = requireRole(session, ['ADMIN']);
    if (!role.ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    // Rate limit by IP
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0]?.trim() || '0.0.0.0';
    const rl = checkRateLimit(`admin:create-person:${ip}`);
    if (!rl.ok) return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body.code !== 'string' || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
    }
    const code = body.code.trim();
    const name = body.name.trim();
    const active = body.active === false ? 0 : 1;

    // Basic validation
    const errors: Record<string, string> = {};
    if (!code || code.length < 3 || code.length > 40) errors.code = 'Código entre 3 y 40 chars';
    if (!/^[A-Za-z0-9_.\-]+$/.test(code)) errors.code = 'Solo letras, números, guiones, guion bajo y punto';
    if (!name || name.length < 2 || name.length > 120) errors.name = 'Nombre entre 2 y 120 chars';
    if (Object.keys(errors).length) return NextResponse.json({ error: 'VALIDATION', details: errors }, { status: 400 });

    // Unique code
    const exists: any[] = await prisma.$queryRawUnsafe(`SELECT id FROM Person WHERE code='${esc(code)}' LIMIT 1`);
    if (exists && exists.length) return NextResponse.json({ error: 'CONFLICT', field: 'code' }, { status: 409 });

    const nowIso = new Date().toISOString();
    await prisma.$executeRawUnsafe(
      `INSERT INTO Person (id, code, name, active, createdAt, updatedAt) VALUES (replace(hex(randomblob(16)),'',''), '${esc(code)}', '${esc(name)}', ${active}, '${nowIso}', '${nowIso}')`
    );
    const row: any[] = await prisma.$queryRawUnsafe(`SELECT id, code, name, active, createdAt FROM Person WHERE code='${esc(code)}' LIMIT 1`);
    const person = row && row[0];
    return NextResponse.json(person, { status: 201 });
  } catch (e: any) {
    console.error('admin persons POST error', e);
    return NextResponse.json({ error: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
