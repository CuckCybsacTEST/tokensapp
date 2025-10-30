export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidArea, ALLOWED_AREAS } from '@/lib/areas';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { audit } from '@/lib/audit';
import bcrypt from 'bcryptjs';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const ok = requireRole(session, ['ADMIN']);
    if (!ok.ok) return NextResponse.json({ ok: false, code: ok.error || 'UNAUTHORIZED' }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        person: true
      }
    });

    if (!user) return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });

    // Transform to React Admin format
    const result = {
      id: user.id,
      username: user.username,
      role: user.role,
      personName: user.person.name,
      dni: user.person.dni,
      area: user.person.area,
      whatsapp: user.person.whatsapp,
      birthday: user.person.birthday,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return NextResponse.json(result);
  } catch (e: any) {
    console.error('admin get user error', e);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const ok = requireRole(session, ['ADMIN']);
    if (!ok.ok) return NextResponse.json({ ok: false, code: ok.error || 'UNAUTHORIZED' }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });

    // Find user and their person first
    const user = await prisma.user.findUnique({ where: { id }, include: { person: true } });
    if (!user) return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });

    // Cascade delete related records in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete any password reset OTPs referencing this user (FK may block otherwise)
      await tx.$executeRawUnsafe('DELETE FROM "PasswordResetOtp" WHERE "userId"=$1', user.id);
      // Delete task statuses updated by this user (foreign relation)
      await tx.personTaskStatus.deleteMany({ where: { updatedBy: user.id } });
      // Delete scans and task statuses for the person
      await tx.personTaskStatus.deleteMany({ where: { personId: user.personId } });
      await tx.scan.deleteMany({ where: { personId: user.personId } });
      // Delete user then person
      await tx.user.delete({ where: { id: user.id } });
      await tx.person.delete({ where: { id: user.personId } });
    });

    await audit('ADMIN_USER_DELETE', undefined, { id, username: user.username, personCode: user.person.code });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('admin delete user error', e);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const ok = requireRole(session, ['ADMIN']);
    if (!ok.ok) return NextResponse.json({ ok: false, code: ok.error || 'UNAUTHORIZED' }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });

    const body = await req.json().catch(() => null) as { personName?: string; role?: string; area?: string; whatsapp?: string; password?: string } | null;
    if (!body || (!body.personName && !body.role && !body.area && !body.whatsapp && !body.password)) {
      return NextResponse.json({ ok: false, code: 'NO_FIELDS' }, { status: 400 });
    }

    const updates: { personNameChanged?: boolean; roleChanged?: boolean; areaChanged?: boolean; whatsappChanged?: boolean; passwordChanged?: boolean } = {};

    // Role update (optional)
    if (body.role != null) {
      const validRoles = ['ADMIN', 'STAFF', 'COLLAB', 'VIP', 'MEMBER', 'GUEST'];
      const role = validRoles.includes(body.role) ? body.role : null;
      if (!role) return NextResponse.json({ ok: false, code: 'INVALID_ROLE' }, { status: 400 });
      const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
      if (!user) return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });
      if (user.role !== role) {
        await prisma.user.update({ where: { id }, data: { role } });
        updates.roleChanged = true;
  await audit('ADMIN_USER_ROLE_CHANGE', undefined, { id, from: user.role, to: role, actorRole: session?.role });
      }
    }

    if (body.personName != null) {
      const personName = String(body.personName || '').trim();
      if (!personName || personName.length < 2 || personName.length > 120) {
        return NextResponse.json({ ok: false, code: 'INVALID_NAME' }, { status: 400 });
      }
      const user = await prisma.user.findUnique({ where: { id }, select: { id: true, personId: true } });
      if (!user?.personId) return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });
      await prisma.person.update({ where: { id: user.personId }, data: { name: personName } });
      updates.personNameChanged = true;
    }

    if (body.area != null) {
      const areaRaw = String(body.area || '').trim();
      if (!isValidArea(areaRaw)) {
        return NextResponse.json({ ok: false, code: 'INVALID_AREA' }, { status: 400 });
      }
      const user = await prisma.user.findUnique({ where: { id }, select: { id: true, personId: true, person: { select: { area: true } } } });
      if (!user?.personId) return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });
      if (user.person?.area !== areaRaw) {
        await prisma.person.update({ where: { id: user.personId }, data: { area: areaRaw } });
        updates.areaChanged = true;
      }
    }

    if (body.whatsapp != null) {
      const raw = String(body.whatsapp || '').trim();
      const digits = raw.replace(/\D+/g, '');
      if (digits.length < 8 || digits.length > 15) {
        return NextResponse.json({ ok: false, code: 'INVALID_WHATSAPP' }, { status: 400 });
      }
      const user = await prisma.user.findUnique({ where: { id }, select: { id: true, personId: true, person: { select: { whatsapp: true } } } });
      if (!user?.personId) return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });
      if (user.person?.whatsapp !== digits) {
        await prisma.person.update({ where: { id: user.personId }, data: { whatsapp: digits } });
        updates.whatsappChanged = true;
      }
    }

    // Password update (optional)
    if (body.password != null) {
      const password = String(body.password || '').trim();
      if (password && (password.length < 6 || password.length > 128)) {
        return NextResponse.json({ ok: false, code: 'INVALID_PASSWORD' }, { status: 400 });
      }
      if (password) {
        // Hash the password
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);
        await prisma.user.update({ where: { id }, data: { passwordHash: hashedPassword } });
        updates.passwordChanged = true;
        await audit('ADMIN_USER_PASSWORD_CHANGE', undefined, { id, actorRole: session?.role });
      }
    }

    return NextResponse.json({ ok: true, updates });
  } catch (e: any) {
    console.error('admin patch user error', e);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
