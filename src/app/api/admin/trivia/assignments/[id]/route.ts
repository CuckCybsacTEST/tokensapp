import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyUserSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const raw = cookies().get('user_session')?.value;
    const session = await verifyUserSessionCookie(raw);

    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const assignmentId = params.id;

    // Verificar que la asignación existe y no está completada
    const assignment = await prisma.commitmentAssignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        status: true,
        user: {
          select: {
            person: {
              select: {
                name: true
              }
            }
          }
        },
        questionSet: {
          select: {
            name: true
          }
        }
      }
    });

    if (!assignment) {
      return NextResponse.json({ ok: false, code: 'ASSIGNMENT_NOT_FOUND' }, { status: 404 });
    }

    // No permitir eliminar asignaciones completadas
    if (assignment.status === 'COMPLETED') {
      return NextResponse.json({
        ok: false,
        code: 'CANNOT_DELETE_COMPLETED',
        message: 'No se pueden eliminar asignaciones que ya han sido completadas'
      }, { status: 400 });
    }

    // Eliminar la asignación
    await prisma.commitmentAssignment.delete({
      where: { id: assignmentId }
    });

    return NextResponse.json({
      ok: true,
      message: `Asignación eliminada: ${assignment.questionSet.name} para ${assignment.user.person.name}`
    });
  } catch (error: any) {
    console.error('[TRIVIA_ASSIGNMENT_DELETE_ERROR]', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}