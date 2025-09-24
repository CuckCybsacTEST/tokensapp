import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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
  const active = body.active === false ? false : true;

    // Basic validation
    const errors: Record<string, string> = {};
    if (!code || code.length < 3 || code.length > 40) errors.code = 'Código entre 3 y 40 chars';
    if (!/^[A-Za-z0-9_.\-]+$/.test(code)) errors.code = 'Solo letras, números, guiones, guion bajo y punto';
    if (!name || name.length < 2 || name.length > 120) errors.name = 'Nombre entre 2 y 120 chars';
    if (Object.keys(errors).length) return NextResponse.json({ error: 'VALIDATION', details: errors }, { status: 400 });

    // Unique code
    const existing = await prisma.person.findUnique({ where: { code }, select: { id: true } });
    if (existing) return NextResponse.json({ error: 'CONFLICT', field: 'code' }, { status: 409 });

    const created = await prisma.person.create({
      data: { code, name, active },
      select: { id: true, code: true, name: true, active: true, createdAt: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    console.error('admin persons POST error', e);
    return NextResponse.json({ error: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
