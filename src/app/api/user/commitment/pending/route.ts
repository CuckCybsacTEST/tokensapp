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

    // Buscar asignaciones para este usuario
    // Si es view-regulation, buscar cualquier assignment, si no, solo PENDING
    const whereClause = viewRegulation ? {
      userId: session.userId
    } : {
      userId: session.userId,
      status: 'PENDING'
    };

    const assignment = await prisma.commitmentAssignment.findFirst({
      where: whereClause,
      include: {
        questionSet: {
          include: {
            questions: {
              where: { active: true },
              include: {
                answers: true
              }
            }
          }
        }
      },
      orderBy: { assignedAt: 'desc' }
    });

    return NextResponse.json({ ok: true, assignment });
  } catch (error: any) {
    console.error('[COMMITMENT_ASSIGNMENT_GET_ERROR]', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
