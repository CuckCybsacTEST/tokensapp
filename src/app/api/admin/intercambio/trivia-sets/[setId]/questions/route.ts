export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';

/** POST — add a question with answers to a set */
export async function POST(
  req: NextRequest,
  { params }: { params: { setId: string } }
) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    // Verify set exists
    const set = await prisma.exchangeTriviaSet.findUnique({ where: { id: params.setId } });
    if (!set) return apiError('NOT_FOUND', 'Set no encontrado', undefined, 404);

    const body = await req.json();
    const { question, order, active, pointsForCorrect, pointsForIncorrect, answers } = body;

    if (!question || question.trim().length === 0) {
      return apiError('BAD_REQUEST', 'La pregunta es requerida', undefined, 400);
    }
    if (!answers || !Array.isArray(answers) || answers.length < 2) {
      return apiError('BAD_REQUEST', 'Se requieren al menos 2 respuestas', undefined, 400);
    }
    const correctCount = answers.filter((a: any) => a.isCorrect).length;
    if (correctCount !== 1) {
      return apiError('BAD_REQUEST', 'Debe haber exactamente 1 respuesta correcta', undefined, 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const q = await tx.exchangeTriviaQuestion.create({
        data: {
          question: question.trim(),
          setId: params.setId,
          order: order ?? 0,
          active: active !== false,
          pointsForCorrect: pointsForCorrect ?? 10,
          pointsForIncorrect: pointsForIncorrect ?? 0,
        },
      });

      await tx.exchangeTriviaAnswer.createMany({
        data: answers.map((a: any, i: number) => ({
          questionId: q.id,
          answer: a.answer.trim(),
          isCorrect: a.isCorrect || false,
          order: a.order ?? i,
        })),
      });

      return tx.exchangeTriviaQuestion.findUnique({
        where: { id: q.id },
        include: { answers: { orderBy: { order: 'asc' } } },
      });
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('[trivia-sets/questions] POST error:', error);
    return apiError('INTERNAL_ERROR', 'Error interno', undefined, 500);
  }
}
