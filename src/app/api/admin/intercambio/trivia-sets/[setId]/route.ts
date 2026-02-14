export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';

/** GET — single set with all questions + answers */
export async function GET(
  req: NextRequest,
  { params }: { params: { setId: string } }
) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const set = await prisma.exchangeTriviaSet.findUnique({
      where: { id: params.setId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            answers: { orderBy: { order: 'asc' } },
            _count: { select: { progress: true } },
          },
        },
        _count: { select: { questions: true, sessions: true } },
      },
    });

    if (!set) return apiError('NOT_FOUND', 'Set no encontrado', undefined, 404);

    return NextResponse.json(set);
  } catch (error: any) {
    console.error('[trivia-sets/[setId]] GET error:', error);
    return apiError('INTERNAL_ERROR', 'Error interno', undefined, 500);
  }
}

/** PUT — update set metadata */
export async function PUT(
  req: NextRequest,
  { params }: { params: { setId: string } }
) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const body = await req.json();

    const set = await prisma.exchangeTriviaSet.update({
      where: { id: params.setId },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.active !== undefined && { active: body.active }),
      },
      include: { _count: { select: { questions: true, sessions: true } } },
    });

    return NextResponse.json(set);
  } catch (error: any) {
    console.error('[trivia-sets/[setId]] PUT error:', error);
    return apiError('INTERNAL_ERROR', 'Error interno', undefined, 500);
  }
}

/** DELETE — remove set (only if no sessions) */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { setId: string } }
) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const sessions = await prisma.exchangeTriviaSession.count({
      where: { setId: params.setId },
    });
    if (sessions > 0) {
      return apiError('BAD_REQUEST', `No se puede eliminar: tiene ${sessions} sesiones asociadas. Desactívalo en su lugar.`, undefined, 400);
    }

    // Cascade delete handles answers via onDelete: Cascade on questions
    await prisma.exchangeTriviaQuestion.deleteMany({ where: { setId: params.setId } });
    await prisma.exchangeTriviaSet.delete({ where: { id: params.setId } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[trivia-sets/[setId]] DELETE error:', error);
    return apiError('INTERNAL_ERROR', 'Error interno', undefined, 500);
  }
}
