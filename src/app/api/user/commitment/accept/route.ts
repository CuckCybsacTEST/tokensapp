import { NextResponse } from 'next/server';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CURRENT_REGULATION } from '@/lib/regulations/constants';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const raw = getUserSessionCookieFromRequest(req as any);
    const session = await verifyUserSessionCookie(raw);
    
    if (!session) return NextResponse.json({ ok:false, code:'UNAUTHORIZED' }, { status:401 });
    
    const body = await req.json().catch(()=>({}));
    const version = Number(body.version);
    const assignmentId = body.assignmentId;
    const acceptOnly = body.acceptOnly; // New flag to accept content without completing assignment

    if (!Number.isFinite(version) || version < CURRENT_REGULATION.version) {
      return NextResponse.json({ ok:false, code:'INVALID_VERSION'}, { status:400 });
    }

    await prisma.$transaction(async (tx) => {
      // Actualizar usuario
      await tx.user.update({
        where: { id: session.userId },
        data: {
          commitmentVersionAccepted: version,
          commitmentAcceptedAt: new Date()
        }
      });

      // Si hay una asignación específica y NO es acceptOnly, marcarla como completada
      if (assignmentId && !acceptOnly) {
        await tx.commitmentAssignment.update({
          where: { id: assignmentId, userId: session.userId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date()
          }
        });
      }
    });

    return NextResponse.json({ ok:true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, code:'INTERNAL', message: String(e?.message||e) }, { status:500 });
  }
}
