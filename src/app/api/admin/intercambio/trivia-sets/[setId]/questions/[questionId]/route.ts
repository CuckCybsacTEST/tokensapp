export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';

/** PUT — update question text + replace answers */
export async function PUT(
  req: NextRequest,
  { params }: { params: { setId: string; questionId: string } }
) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const body = await req.json();
    const { question, order, active, pointsForCorrect, pointsForIncorrect, answers } = body;

    if (answers) {
      if (!Array.isArray(answers) || answers.length < 2) {
        return apiError('BAD_REQUEST', 'Se requieren al menos 2 respuestas', undefined, 400);
      }
      const correctCount = answers.filter((a: any) => a.isCorrect).length;
      if (correctCount !== 1) {
        return apiError('BAD_REQUEST', 'Debe haber exactamente 1 respuesta correcta', undefined, 400);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.exchangeTriviaQuestion.update({
        where: { id: params.questionId },
        data: {
          ...(question !== undefined && { question: question.trim() }),
          ...(order !== undefined && { order }),
          ...(active !== undefined && { active }),
          ...(pointsForCorrect !== undefined && { pointsForCorrect }),
          ...(pointsForIncorrect !== undefined && { pointsForIncorrect }),
        },
      });

      if (answers) {
        await tx.exchangeTriviaAnswer.deleteMany({ where: { questionId: params.questionId } });
        await tx.exchangeTriviaAnswer.createMany({
          data: answers.map((a: any, i: number) => ({
            questionId: params.questionId,
            answer: a.answer.trim(),
            isCorrect: a.isCorrect || false,
            order: a.order ?? i,
          })),
        });
      }

      return tx.exchangeTriviaQuestion.findUnique({
        where: { id: params.questionId },
        include: { answers: { orderBy: { order: 'asc' } } },
      });
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[trivia-sets/questions/[questionId]] PUT error:', error);
    return apiError('INTERNAL_ERROR', 'Error interno', undefined, 500);
  }
}

/** DELETE — remove question and its answers */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { setId: string; questionId: string } }
) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    await prisma.exchangeTriviaAnswer.deleteMany({ where: { questionId: params.questionId } });
    await prisma.exchangeTriviaQuestion.delete({ where: { id: params.questionId } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[trivia-sets/questions/[questionId]] DELETE error:', error);
    return apiError('INTERNAL_ERROR', 'Error interno', undefined, 500);
  }
}
