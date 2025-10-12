import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';

// STAFF endpoint: solo permite eliminar usuarios COLLAB completos (user + person) y nunca STAFF/ADMIN
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const ok = requireRole(session, ['STAFF']);
    if (!ok.ok) return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });

    const id = params.id;
    if (!id) return NextResponse.json({ ok: false, code: 'BAD_REQUEST' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id }, include: { person: true } });
    if (!user) return NextResponse.json({ ok: false, code: 'NOT_FOUND' }, { status: 404 });
    if (user.role !== 'COLLAB') return NextResponse.json({ ok: false, code: 'FORBIDDEN_ROLE' }, { status: 403 });

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('DELETE FROM "PasswordResetOtp" WHERE "userId"=$1', user.id);
      await tx.personTaskStatus.deleteMany({ where: { updatedBy: user.id } });
      await tx.personTaskStatus.deleteMany({ where: { personId: user.personId } });
      await tx.scan.deleteMany({ where: { personId: user.personId } });
      await tx.user.delete({ where: { id: user.id } });
      await tx.person.delete({ where: { id: user.personId } });
    });

    await audit('STAFF_USER_DELETE', undefined, { id: user.id, username: user.username, personCode: user.person?.code });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('staff delete collab error', e);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
