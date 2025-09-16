import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { audit } from '@/lib/audit';

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
