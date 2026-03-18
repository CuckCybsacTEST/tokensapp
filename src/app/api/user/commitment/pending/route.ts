import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyUserSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const raw = cookies().get('user_session')?.value;
    const session = await verifyUserSessionCookie(raw);
    
    if (!session) {
      return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const url = new URL(req.url);
    const viewRegulation = url.searchParams.get('view-regulation') === '1';

    // view-regulation: devuelve UNA asignación cualquiera (para re-lectura)
    if (viewRegulation) {
      const assignment = await prisma.commitmentAssignment.findFirst({
        where: { userId: session.userId },
        include: {
          questionSet: {
            include: {
              questions: {
                where: { active: true },
                include: { answers: true }
              }
            }
          }
        },
        orderBy: { assignedAt: 'desc' }
      });
      return NextResponse.json({ ok: true, assignment, assignments: assignment ? [assignment] : [] });
    }

    // Normal: devolver TODAS las asignaciones obligatorias pendientes (cola)
    const assignments = await prisma.commitmentAssignment.findMany({
      where: {
        userId: session.userId,
        status: 'PENDING',
        mandatory: true
      },
      include: {
        questionSet: {
          include: {
            questions: {
              where: { active: true },
              include: { answers: true }
            }
          }
        }
      },
      orderBy: { assignedAt: 'asc' } // oldest first = chronological queue
    });

    // Backwards-compatible: also return single `assignment` (first in queue)
    const assignment = assignments.length > 0 ? assignments[0] : null;

    return NextResponse.json({ ok: true, assignment, assignments });
  } catch (error: any) {
    console.error('[COMMITMENT_ASSIGNMENT_GET_ERROR]', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
