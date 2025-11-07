import { z } from "zod";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import {
  createTriviaSuccessResponse,
  createTriviaErrorResponse,
  handleTriviaValidationError,
  withTriviaErrorHandler,
  getClientIP
} from "@/lib/trivia-api";
import { checkTriviaAnswerRateLimit, checkTriviaSessionRateLimit } from "@/lib/trivia-rate-limit";
import { logTriviaEvent, logTriviaSession, logTriviaAnswer } from "@/lib/trivia-log";
import { nowInLima, isValidInLima } from "@/lib/trivia-time";

const startSessionSchema = z.object({
  questionSetId: z.string(), // ID del set de preguntas a usar
  sessionId: z.string().optional(), // Si se proporciona, continúa sesión existente
});

const answerQuestionSchema = z.object({
  sessionId: z.string(),
  questionId: z.string(),
  answerId: z.string(),
});

export const GET = withTriviaErrorHandler(async (req: Request) => {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId) {
    return createTriviaErrorResponse('VALIDATION_ERROR', 'Se requiere sessionId', 400);
  }

  const session = await prisma.triviaSession.findUnique({
    where: { sessionId },
    include: {
      questionSet: true,
      prize: {
        include: {
          questionSet: true
        }
      },
      progress: {
        include: {
          question: {
            include: {
              answers: {
                orderBy: { order: 'asc' }
              }
            }
          },
          selectedAnswer: true
        },
        orderBy: { answeredAt: 'asc' }
      }
    }
  });

  if (!session) {
    return createTriviaErrorResponse('SESSION_EXPIRED', 'Sesión no encontrada', 404);
  }

  // Obtener todas las preguntas del set activo
  const allQuestions = await prisma.triviaQuestion.findMany({
    where: {
      questionSetId: session.questionSetId,
      active: true
    },
    include: {
      answers: {
        orderBy: { order: 'asc' }
      }
    },
    orderBy: { order: 'asc' }
  });

  // Determinar la siguiente pregunta
  const answeredQuestionIds = session.progress.map(p => p.questionId);
  const nextQuestion = allQuestions.find(q => !answeredQuestionIds.includes(q.id));

  const response = {
    session: {
      id: session.sessionId,
      currentQuestionIndex: session.currentQuestionIndex,
      completed: session.completed,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      totalQuestions: allQuestions.length,
      answeredQuestions: session.progress.length,
      questionSet: {
        id: session.questionSet.id,
        name: session.questionSet.name
      }
    },
    nextQuestion: nextQuestion ? {
      id: nextQuestion.id,
      question: nextQuestion.question,
      answers: nextQuestion.answers.map(a => ({
        id: a.id,
        answer: a.answer
      }))
    } : null,
    progress: session.progress.map(p => ({
      questionId: p.questionId,
      isCorrect: p.isCorrect,
      answeredAt: p.answeredAt
    })),
    prize: session.prize ? {
      id: session.prize.id,
      name: session.prize.name,
      description: session.prize.description,
      qrCode: session.prize.qrCode
    } : null
  };

  logTriviaEvent('SESSION_STATUS_RETRIEVED', 'Estado de sesión de trivia recuperado', {
    questionSetId: session.questionSetId,
    completed: session.completed,
    progressCount: session.progress.length
  }, 'INFO', session.sessionId);

  return createTriviaSuccessResponse(response);
});

export const POST = withTriviaErrorHandler(async (req: Request) => {
  const json = await req.json();

  // Determinar si es inicio de sesión o respuesta a pregunta
  if (json.questionId && json.answerId) {
    // Es una respuesta a pregunta
    return await handleAnswerQuestion(json, req);
  } else {
    // Es inicio de sesión
    return await handleStartSession(json, req);
  }
});

async function handleStartSession(data: any, req: Request) {
  const parsed = startSessionSchema.safeParse(data);
  if (!parsed.success) {
    return handleTriviaValidationError(parsed.error);
  }

  const { questionSetId, sessionId } = parsed.data;
  const clientIP = getClientIP(req as any);

  // Rate limiting para iniciar sesiones
  const sessionRateLimit = checkTriviaSessionRateLimit(clientIP);
  if (!sessionRateLimit.ok) {
    return createTriviaErrorResponse(
      'RATE_LIMIT_EXCEEDED',
      'Demasiadas sesiones iniciadas. Intente nuevamente más tarde.',
      429
    );
  }

  // Verificar que el question set existe y está activo
  const questionSet = await prisma.triviaQuestionSet.findUnique({
    where: { id: questionSetId, active: true }
  });

  if (!questionSet) {
    return createTriviaErrorResponse('QUESTION_SET_NOT_FOUND', 'Set de preguntas no encontrado o inactivo', 404);
  }

  if (sessionId) {
    // Verificar que la sesión existe y pertenece al mismo question set
    const existingSession = await prisma.triviaSession.findUnique({
      where: { sessionId }
    });

    if (!existingSession) {
      return createTriviaErrorResponse('SESSION_EXPIRED', 'Sesión no encontrada', 404);
    }

    if (existingSession.questionSetId !== questionSetId) {
      return createTriviaErrorResponse('INVALID_QUESTION_SET', 'La sesión pertenece a un set de preguntas diferente', 400);
    }

    logTriviaSession('RESUME', sessionId, { questionSetId });
  } else {
    // Crear nueva sesión
    const newSessionId = randomUUID();

    await prisma.triviaSession.create({
      data: {
        sessionId: newSessionId,
        questionSetId
      }
    });

    logTriviaSession('START', newSessionId, { questionSetId });

    // Contar preguntas activas en el set
    const totalQuestions = await prisma.triviaQuestion.count({
      where: { questionSetId, active: true }
    });

    return createTriviaSuccessResponse({
      session: {
        id: newSessionId,
        currentQuestionIndex: 0,
        completed: false,
        startedAt: new Date(),
        totalQuestions,
        answeredQuestions: 0,
        questionSet: {
          id: questionSet.id,
          name: questionSet.name
        }
      },
      message: "Sesión iniciada correctamente"
    });
  }

  // Si llegó aquí, es una sesión existente - redirigir a GET
  return createTriviaSuccessResponse({ redirect: true, sessionId });
}

async function handleAnswerQuestion(data: any, req: Request) {
  const parsed = answerQuestionSchema.safeParse(data);
  if (!parsed.success) {
    return handleTriviaValidationError(parsed.error);
  }

  const { sessionId, questionId, answerId } = parsed.data;
  const clientIP = getClientIP(req as any);

  // Rate limiting para respuestas
  const answerRateLimit = checkTriviaAnswerRateLimit(sessionId, clientIP);
  if (!answerRateLimit.ok) {
    return createTriviaErrorResponse(
      'RATE_LIMIT_EXCEEDED',
      'Demasiadas respuestas. Intente nuevamente más tarde.',
      429
    );
  }

  // Verificar que la sesión existe
  const session = await prisma.triviaSession.findUnique({
    where: { sessionId },
    include: {
      questionSet: true,
      progress: {
        orderBy: { answeredAt: 'desc' },
        take: 1
      }
    }
  });

  if (!session) {
    return createTriviaErrorResponse('SESSION_EXPIRED', 'Sesión no encontrada', 404);
  }

  if (session.completed) {
    return createTriviaErrorResponse('SESSION_EXPIRED', 'Sesión ya completada', 409);
  }

  // Verificar tiempo entre respuestas (mínimo 2 segundos para prevenir bots)
  if (session.progress.length > 0) {
    const lastAnswer = session.progress[0];
    const timeSinceLastAnswer = Date.now() - lastAnswer.answeredAt.getTime();
    if (timeSinceLastAnswer < 2000) { // 2 segundos
      logTriviaEvent('answer_too_fast', `Answer too fast (${timeSinceLastAnswer}ms) for session ${sessionId}`, {
        sessionId,
        timeSinceLastAnswer,
        ip: clientIP
      });
      return createTriviaErrorResponse('VALIDATION_ERROR', 'Espera un momento antes de responder', 429);
    }
  }

  // Verificar que la pregunta existe, está activa y pertenece al question set de la sesión
  const question = await prisma.triviaQuestion.findUnique({
    where: {
      id: questionId,
      active: true,
      questionSetId: session.questionSetId
    },
    include: { answers: true }
  });

  if (!question) {
    return createTriviaErrorResponse('INVALID_ANSWER', 'Pregunta no encontrada o no pertenece a este set', 404);
  }

  // Verificar que la respuesta pertenece a la pregunta
  const selectedAnswer = question.answers.find(a => a.id === answerId);
  if (!selectedAnswer) {
    return createTriviaErrorResponse('INVALID_ANSWER', 'Respuesta inválida', 400);
  }

  // Verificar que no haya respondido esta pregunta antes
  const existingProgress = await prisma.triviaProgress.findUnique({
    where: {
      sessionId_questionId: {
        sessionId: session.id,
        questionId
      }
    }
  });

  if (existingProgress) {
    return createTriviaErrorResponse('INVALID_ANSWER', 'Pregunta ya respondida', 409);
  }

  // Verificar orden de preguntas (debe responder en orden)
  const totalActiveQuestions = await prisma.triviaQuestion.count({
    where: { questionSetId: session.questionSetId, active: true }
  });
  const expectedQuestionOrder = session.currentQuestionIndex + 1;

  // Obtener todas las preguntas ordenadas del set
  const allQuestions = await prisma.triviaQuestion.findMany({
    where: { questionSetId: session.questionSetId, active: true },
    orderBy: { order: 'asc' }
  });

  if (expectedQuestionOrder <= allQuestions.length) {
    const expectedQuestion = allQuestions[expectedQuestionOrder - 1];
    if (expectedQuestion.id !== questionId) {
      logTriviaEvent('wrong_question_order', `Wrong question order for session ${sessionId}`, {
        sessionId,
        expectedQuestionId: expectedQuestion.id,
        attemptedQuestionId: questionId,
        ip: clientIP
      });
      return createTriviaErrorResponse('INVALID_ANSWER', 'Debes responder las preguntas en orden', 400);
    }
  }

  // Registrar la respuesta
  const isCorrect = selectedAnswer.isCorrect;
  const progress = await prisma.triviaProgress.create({
    data: {
      sessionId: session.id,
      questionId,
      selectedAnswerId: answerId,
      isCorrect
    }
  });

  logTriviaAnswer(sessionId, questionId, answerId, isCorrect);

  // Actualizar el índice de pregunta actual en la sesión
  const currentProgressCount = await prisma.triviaProgress.count({
    where: { sessionId: session.id }
  });

  await prisma.triviaSession.update({
    where: { id: session.id },
    data: { currentQuestionIndex: currentProgressCount }
  });

  // Verificar si completó todas las preguntas
  const totalQuestions = await prisma.triviaQuestion.count({
    where: { questionSetId: session.questionSetId, active: true }
  });
  const completed = currentProgressCount >= totalQuestions;

  let prize = null;
  if (completed) {
    // Completó la trivia - asignar premio del question set
    prize = await assignTriviaPrize(session.id, session.questionSetId);
    await prisma.triviaSession.update({
      where: { id: session.id },
      data: {
        completed: true,
        completedAt: new Date(),
        prizeId: prize?.id
      }
    });

    logTriviaSession('COMPLETE', sessionId, {
      questionSetId: session.questionSetId,
      prizeId: prize?.id
    });
  }

  return createTriviaSuccessResponse({
    isCorrect,
    completed,
    currentQuestionIndex: currentProgressCount,
    totalQuestions,
    prize: prize ? {
      id: prize.id,
      name: prize.name,
      description: prize.description,
      qrCode: prize.qrCode
    } : null
  });
}

async function assignTriviaPrize(sessionId: string, questionSetId: string) {
  // Obtener premios disponibles para este question set que estén válidos en el tiempo actual
  const now = nowInLima();

  const availablePrizes = await prisma.triviaPrize.findMany({
    where: {
      questionSetId,
      active: true,
      validFrom: { lte: now.toJSDate() },
      validUntil: { gte: now.toJSDate() }
    }
  });

  if (availablePrizes.length === 0) {
    logTriviaEvent('no_prizes_available', `No prizes available for session ${sessionId}`, {
      sessionId,
      questionSetId,
      currentTime: now.toISO()
    });
    return null; // No hay premios disponibles
  }

  // Seleccionar un premio aleatorio
  const randomPrize = availablePrizes[Math.floor(Math.random() * availablePrizes.length)];

  logTriviaEvent('prize_assigned', `Prize "${randomPrize.name}" assigned to session ${sessionId}`, {
    sessionId,
    questionSetId,
    prizeId: randomPrize.id,
    prizeName: randomPrize.name
  });

  return randomPrize;
}
