export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';

/**
 * POST /api/exchange/trivia/answer
 * Public — submit answer for current question
 *
 * Body: { sessionId: string, questionId: string, answerId: string }
 * Returns: { correct, points, completed, totalPoints, nextQuestion? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, questionId, answerId } = body;

    if (!sessionId || !questionId || !answerId) {
      return apiError('BAD_REQUEST', 'sessionId, questionId y answerId son requeridos', undefined, 400);
    }

    // Load session with its question set
    const session = await prisma.exchangeTriviaSession.findUnique({
      where: { id: sessionId },
      include: {
        set: {
          include: {
            questions: {
              where: { active: true },
              orderBy: { order: 'asc' },
              include: {
                answers: { orderBy: { order: 'asc' }, select: { id: true, answer: true, isCorrect: true, order: true } },
              },
            },
          },
        },
      },
    });

    if (!session) {
      return apiError('NOT_FOUND', 'Sesión no encontrada', undefined, 404);
    }
    if (session.completed) {
      return apiError('BAD_REQUEST', 'Esta sesión ya fue completada', undefined, 400);
    }

    // Validate question matches current index
    const questions = session.set.questions;
    const currentQ = questions[session.currentQuestionIndex];
    if (!currentQ || currentQ.id !== questionId) {
      return apiError('BAD_REQUEST', 'Pregunta no coincide con la actual', undefined, 400);
    }

    // Check if already answered
    const existing = await prisma.exchangeTriviaProgress.findUnique({
      where: { sessionId_questionId: { sessionId, questionId } },
    });
    if (existing) {
      return apiError('BAD_REQUEST', 'Esta pregunta ya fue respondida', undefined, 400);
    }

    // Evaluate answer
    const selectedAnswer = currentQ.answers.find(a => a.id === answerId);
    if (!selectedAnswer) {
      return apiError('BAD_REQUEST', 'Respuesta no válida', undefined, 400);
    }

    const isCorrect = selectedAnswer.isCorrect;
    const points = isCorrect ? currentQ.pointsForCorrect : currentQ.pointsForIncorrect;
    const newTotalPoints = session.totalPoints + points;
    const nextIndex = session.currentQuestionIndex + 1;
    const isCompleted = nextIndex >= questions.length;

    // Record progress + update session in transaction
    await prisma.$transaction(async (tx) => {
      await tx.exchangeTriviaProgress.create({
        data: {
          sessionId,
          questionId,
          selectedAnswerId: answerId,
          isCorrect,
        },
      });

      await tx.exchangeTriviaSession.update({
        where: { id: sessionId },
        data: {
          currentQuestionIndex: nextIndex,
          totalPoints: newTotalPoints,
          ...(isCompleted && { completed: true, completedAt: new Date() }),
        },
      });
    });

    // Build response
    const response: any = {
      correct: isCorrect,
      correctAnswerId: currentQ.answers.find(a => a.isCorrect)?.id,
      points,
      totalPoints: newTotalPoints,
      completed: isCompleted,
      questionIndex: session.currentQuestionIndex,
      totalQuestions: questions.length,
    };

    if (!isCompleted) {
      const nextQ = questions[nextIndex];
      response.nextQuestion = {
        id: nextQ.id,
        question: nextQ.question,
        answers: nextQ.answers.map(a => ({ id: a.id, answer: a.answer, order: a.order })),
      };
    } else {
      response.sessionId = sessionId;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[exchange/trivia/answer] Error:', error);
    return apiError('INTERNAL_ERROR', 'Error procesando respuesta', undefined, 500);
  }
}
