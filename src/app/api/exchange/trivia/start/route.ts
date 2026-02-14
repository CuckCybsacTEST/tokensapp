export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';

/**
 * POST /api/exchange/trivia/start
 * Public — start a trivia session for a batch's question set
 *
 * Body: { questionSetId: string }
 * Returns: { sessionId, totalQuestions, currentQuestion }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { questionSetId } = body;

    if (!questionSetId) {
      return apiError('BAD_REQUEST', 'questionSetId es requerido', undefined, 400);
    }

    const set = await prisma.exchangeTriviaSet.findUnique({
      where: { id: questionSetId, active: true },
      include: {
        questions: {
          where: { active: true },
          orderBy: { order: 'asc' },
          include: {
            answers: {
              orderBy: { order: 'asc' },
              select: { id: true, answer: true, order: true },
            },
          },
        },
      },
    });

    if (!set) {
      return apiError('NOT_FOUND', 'Set de trivia no encontrado o inactivo', undefined, 404);
    }
    if (set.questions.length === 0) {
      return apiError('BAD_REQUEST', 'Este set no tiene preguntas activas', undefined, 400);
    }

    // Create session
    const triviaSession = await prisma.exchangeTriviaSession.create({
      data: {
        setId: set.id,
        currentQuestionIndex: 0,
        completed: false,
        totalPoints: 0,
      },
    });

    const firstQ = set.questions[0];

    return NextResponse.json({
      sessionId: triviaSession.id,
      totalQuestions: set.questions.length,
      currentQuestionIndex: 0,
      question: {
        id: firstQ.id,
        question: firstQ.question,
        answers: firstQ.answers,
      },
    });
  } catch (error: any) {
    console.error('[exchange/trivia/start] Error:', error);
    return apiError('INTERNAL_ERROR', 'Error iniciando trivia', undefined, 500);
  }
}
