export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { isValidArea } from '@/lib/areas';
import { createUserSessionCookie, buildSetUserCookie } from '@/lib/auth-user';

const esc = (s: string) => s.replace(/'/g, "''");
const normalizeDni = (s: string) => String(s || '').replace(/\D+/g, '');

function isValidName(n: string) {
  if (typeof n !== 'string') return false;
  const cleaned = n.trim().replace(/\s+/g, ' ');
  if (cleaned.length < 5) return false; // ej: "Ana Li" mínimo 5 con espacio
  const parts = cleaned.split(' ');
  if (parts.length < 2) return false; // requiere al menos nombre + apellido
  // Cada parte >=2 caracteres alfabéticos (permitimos acentos, ñ, apóstrofe y guion)
  return parts.every(p => /^(?=.{2,})([A-Za-zÁÉÍÓÚÜÑáéíóúüñ'-])+$/u.test(p));
}
function isValidPassword(pw: string) { return typeof pw === 'string' && pw.length >= 8; }

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const dniRaw = typeof body?.dni === 'string' ? body.dni.trim() : '';
    const area = typeof body?.area === 'string' ? body.area.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!isValidName(name)) {
      return NextResponse.json({ ok: false, code: 'INVALID_NAME' }, { status: 400 });
    }
    const dni = normalizeDni(dniRaw);
    if (!dni) {
      return NextResponse.json({ ok: false, code: 'INVALID_DNI' }, { status: 400 });
    }
    if (!isValidArea(area)) {
      return NextResponse.json({ ok: false, code: 'INVALID_AREA' }, { status: 400 });
    }
    if (!isValidPassword(password)) {
      return NextResponse.json({ ok: false, code: 'INVALID_PASSWORD' }, { status: 400 });
    }

    // Username y code = DNI normalizado; role fijo COLLAB
    const username = dni;
    const code = dni;

    // checks de unicidad con Prisma
    const [uExists, dniExists, codeExists] = await Promise.all([
      prisma.user.findFirst({ where: { username } }),
      prisma.person.findFirst({ where: { dni } }),
      prisma.person.findFirst({ where: { code } }),
    ]);
    if (uExists) return NextResponse.json({ ok: false, code: 'USERNAME_TAKEN' }, { status: 409 });
    if (dniExists) return NextResponse.json({ ok: false, code: 'DNI_TAKEN' }, { status: 409 });
    if (codeExists) return NextResponse.json({ ok: false, code: 'CODE_TAKEN' }, { status: 409 });

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const created = await prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: { code, name, dni, area, active: true },
      });
      const user = await tx.user.create({
        data: { username, passwordHash, role: 'COLLAB', personId: person.id },
      });
      return { person, user };
    });

    // Auto-login: emitir cookie de usuario
    const token = await createUserSessionCookie(created.user.id, 'COLLAB');
    return new NextResponse(
      JSON.stringify({ ok: true, user: { id: created.user.id, username }, person: { id: created.person.id, code, name, dni, area } }),
      { status: 201, headers: { 'Set-Cookie': buildSetUserCookie(token) } }
    );
  } catch (e: any) {
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
    console.error('public register error', e);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: msg }, { status: 500 });
  }
}
