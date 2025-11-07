import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';
import { formatBirthdayLabel, parseBirthdayInput } from '@/lib/birthday';
import { isValidArea } from '@/lib/areas';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const raw = getUserSessionCookieFromRequest(req);
    const session = await verifyUserSessionCookie(raw);
    if (!session || session.role !== 'STAFF') {
      return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
    }
    const users = await prisma.user.findMany({
      orderBy: { person: { code: 'asc' } },
      select: {
        id: true,
        username: true,
        role: true,
        person: { select: { code: true, name: true, dni: true, area: true, birthday: true, whatsapp: true } }
      }
    });
    const rows = users.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      personCode: u.person?.code ?? null,
      personName: u.person?.name ?? null,
      dni: u.person?.dni ?? null,
      area: u.person?.area ?? null,
      birthday: u.person?.birthday ? formatBirthdayLabel(u.person?.birthday) : null,
      whatsapp: u.person?.whatsapp ?? null,
    }));
    return NextResponse.json({ ok: true, users: rows });
  } catch (e: any) {
    console.error('staff list users error', e);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}

// Crear colaborador (solo STAFF). Siempre crea role COLLAB.
export async function POST(req: Request) {
  try {
    const raw = getUserSessionCookieFromRequest(req);
    const session = await verifyUserSessionCookie(raw);
    if (!session || session.role !== 'STAFF') return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json().catch(()=>({}));
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const dniRaw = typeof body.dni === 'string' ? body.dni.trim() : '';
    const area = typeof body.area === 'string' ? body.area.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const whatsappRaw = typeof body.whatsapp === 'string' ? body.whatsapp.trim() : '';
    const birthdayRaw = typeof body.birthday === 'string' ? body.birthday.trim() : '';

    const normalizeDni = (s:string)=> String(s||'').replace(/\D+/g,'');
    const normalizeWhatsapp = (s:string)=> String(s||'').replace(/\D+/g,'');
    function isValidName(n:string){ const t=n.trim(); return t.length>=2 && t.length<=120; }
    function isValidPassword(pw:string){ return typeof pw==='string' && pw.length>=8; }
    function isValidWhatsapp(w:string){ const n=normalizeWhatsapp(w); return n.length>=8 && n.length<=15; }

    const dni = normalizeDni(dniRaw);
    const whatsapp = normalizeWhatsapp(whatsappRaw);
    const birthdayDate = parseBirthdayInput(birthdayRaw);

    if (!isValidName(name)) return NextResponse.json({ ok:false, code:'INVALID_NAME' }, { status:400 });
    if (!dni) return NextResponse.json({ ok:false, code:'INVALID_DNI' }, { status:400 });
    if (!isValidArea(area)) return NextResponse.json({ ok:false, code:'INVALID_AREA' }, { status:400 });
    if (!isValidPassword(password)) return NextResponse.json({ ok:false, code:'INVALID_PASSWORD' }, { status:400 });
    if (!isValidWhatsapp(whatsapp)) return NextResponse.json({ ok:false, code:'INVALID_WHATSAPP' }, { status:400 });
    if (!birthdayDate) return NextResponse.json({ ok:false, code:'INVALID_BIRTHDAY' }, { status:400 });

    const username = dni; // username y code = DNI normalizado
    const code = dni;

    const [uExists, dniExists, codeExists] = await Promise.all([
      prisma.user.findFirst({ where: { username } }),
      prisma.person.findFirst({ where: { dni } }),
      prisma.person.findFirst({ where: { code } }),
    ]);
    if (uExists) return NextResponse.json({ ok:false, code:'USERNAME_TAKEN' }, { status:409 });
    if (dniExists) return NextResponse.json({ ok:false, code:'DNI_TAKEN' }, { status:409 });
    if (codeExists) return NextResponse.json({ ok:false, code:'CODE_TAKEN' }, { status:409 });

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const created = await prisma.$transaction(async (tx) => {
      const person = await tx.person.create({ data: { code, name, dni, area, active: true, whatsapp, birthday: birthdayDate } });
      const user = await tx.user.create({ data: { username, passwordHash, role: 'COLLAB', personId: person.id } });
      return { user, person };
    });
    return NextResponse.json({ ok:true, user: { id: created.user.id, username: created.user.username, role: 'COLLAB' }, person: { id: created.person.id, code, name, dni, area, whatsapp, birthday: formatBirthdayLabel(created.person.birthday) } }, { status:201 });
  } catch (e:any) {
    const msg = String(e?.message || e);
    if (msg.includes('UNIQUE') && msg.includes('User') && msg.includes('username')) return NextResponse.json({ ok:false, code:'USERNAME_TAKEN' }, { status:409 });
    if (msg.includes('UNIQUE') && msg.includes('Person') && msg.includes('dni')) return NextResponse.json({ ok:false, code:'DNI_TAKEN' }, { status:409 });
    if (msg.includes('UNIQUE') && msg.includes('Person') && msg.includes('code')) return NextResponse.json({ ok:false, code:'CODE_TAKEN' }, { status:409 });
    console.error('staff create collab error', e);
    return NextResponse.json({ ok:false, code:'INTERNAL', message: msg }, { status:500 });
  }
}
