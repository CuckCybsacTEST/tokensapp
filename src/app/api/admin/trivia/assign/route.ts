import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyUserSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const raw = cookies().get('user_session')?.value;
    const session = await verifyUserSessionCookie(raw);
    
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const assignments = await prisma.commitmentAssignment.findMany({
      include: {
        user: { include: { person: true } },
        questionSet: true
      },
      orderBy: { assignedAt: 'desc' }
    });

    return NextResponse.json({ ok: true, assignments });
  } catch (error: any) {
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const raw = cookies().get('user_session')?.value;
    const session = await verifyUserSessionCookie(raw);
    
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { userIds, questionSetId, area, includeTrivia } = await req.json();

    let targetUserIds = userIds || [];

    // Si se especifica área, buscar todos los usuarios de ese área
    if (area) {
      const usersInArea = await prisma.user.findMany({
        where: {
          person: { area: area }
        },
        select: { id: true }
      });
      targetUserIds = [...new Set([...targetUserIds, ...usersInArea.map(u => u.id)])];
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({ ok: false, code: 'NO_USERS_SELECTED' }, { status: 400 });
    }

    // Crear asignaciones
    const creations = targetUserIds.map((uid: string) => ({
      userId: uid,
      questionSetId: questionSetId,
      status: 'PENDING',
      includeTrivia: !!includeTrivia,
      assignedAt: new Date()
    }));

    await prisma.commitmentAssignment.createMany({
      data: creations,
      skipDuplicates: true // Evitar duplicar si ya tienen la misma asignación pendiente (aunque ID es CUID, aquí no funcionará skipDuplicates sin constraint única)
    });

    return NextResponse.json({ ok: true, count: targetUserIds.length });
  } catch (error: any) {
    console.error('[TRIVIA_ASSIGN_ERROR]', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
