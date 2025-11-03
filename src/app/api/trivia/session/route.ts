import { z } from "zod";
import { randomUUID } from "crypto";

import { apiError, apiOk } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/log";
import { checkRateLimitCustom } from "@/lib/rateLimit";

const startSessionSchema = z.object({
  sessionId: z.string().optional(), // Si se proporciona, continúa sesión existente
});

const answerQuestionSchema = z.object({
  sessionId: z.string(),
  questionId: z.string(),
  answerId: z.string(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return apiError("MISSING_SESSION", "Se requiere sessionId", {}, 400);
    }

    const session = await prisma.triviaSession.findUnique({
      where: { sessionId },
      include: {
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
      return apiError("SESSION_NOT_FOUND", "Sesión no encontrada", {}, 404);
    }

    // Obtener todas las preguntas activas
    const allQuestions = await prisma.triviaQuestion.findMany({
      where: { active: true },
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
        answeredQuestions: session.progress.length
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
      }))
    };

    return apiOk(response, 200);
  } catch (error) {
    console.error('Error getting trivia session:', error);
    return apiError("DB_ERROR", "Error al obtener sesión", {}, 500);
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();

    // Determinar si es inicio de sesión o respuesta a pregunta
    if (json.questionId && json.answerId) {
      // Es una respuesta a pregunta
      return await handleAnswerQuestion(json);
    } else {
      // Es inicio de sesión
      return await handleStartSession(json);
    }
  } catch (error) {
    console.error('Error in trivia session:', error);
    return apiError("INTERNAL_ERROR", "Error interno", {}, 500);
  }
}

async function handleStartSession(data: any) {
  const parsed = startSessionSchema.safeParse(data);
  if (!parsed.success) {
    return apiError("INVALID_BODY", "Datos inválidos", parsed.error.flatten(), 400);
  }

  const { sessionId } = parsed.data;

  if (sessionId) {
    // Verificar que la sesión existe
    const existingSession = await prisma.triviaSession.findUnique({
      where: { sessionId }
    });

    if (!existingSession) {
      return apiError("SESSION_NOT_FOUND", "Sesión no encontrada", {}, 404);
    }

    await logEvent("TRIVIA_SESSION_RESUME", "Sesión de trivia reanudada", { sessionId });
  } else {
    // Crear nueva sesión
    const newSessionId = randomUUID();

    await prisma.triviaSession.create({
      data: {
        sessionId: newSessionId,
      }
    });

    await logEvent("TRIVIA_SESSION_START", "Sesión de trivia iniciada", { sessionId: newSessionId });

    return apiOk({
      session: {
        id: newSessionId,
        currentQuestionIndex: 0,
        completed: false,
        startedAt: new Date(),
        totalQuestions: await prisma.triviaQuestion.count({ where: { active: true } }),
        answeredQuestions: 0
      },
      message: "Sesión iniciada correctamente"
    }, 201);
  }

  // Si llegó aquí, es una sesión existente - redirigir a GET
  return apiOk({ redirect: true, sessionId }, 200);
}

async function handleAnswerQuestion(data: any) {
  const parsed = answerQuestionSchema.safeParse(data);
  if (!parsed.success) {
    return apiError("INVALID_BODY", "Datos inválidos", parsed.error.flatten(), 400);
  }

  const { sessionId, questionId, answerId } = parsed.data;

  // Rate limiting por sesión
  const ipHeader =
    new Request('http://localhost').headers.get("x-forwarded-for") ||
    new Request('http://localhost').headers.get("x-real-ip") ||
    "unknown";
  const ip = ipHeader.split(",")[0].trim();
  const rateLimitKey = `trivia-answer:${sessionId}:${ip}`;
  const rl = checkRateLimitCustom(rateLimitKey, 10, 60000); // 10 respuestas por minuto por sesión/IP
  if (!rl.ok) {
    await logEvent("TRIVIA_RATE_LIMIT", "Rate limit excedido en trivia", {
      sessionId,
      ip,
      retryAfterSeconds: rl.retryAfterSeconds
    });
    return apiError(
      "RATE_LIMIT",
      "Demasiadas respuestas. Espera un momento.",
      { retryAfterSeconds: rl.retryAfterSeconds },
      429,
      { "Retry-After": rl.retryAfterSeconds.toString() }
    );
  }

  // Verificar que la sesión existe
  const session = await prisma.triviaSession.findUnique({
    where: { sessionId },
    include: {
      progress: {
        orderBy: { answeredAt: 'desc' },
        take: 1
      }
    }
  });

  if (!session) {
    return apiError("SESSION_NOT_FOUND", "Sesión no encontrada", {}, 404);
  }

  if (session.completed) {
    return apiError("SESSION_COMPLETED", "Sesión ya completada", {}, 409);
  }

  // Verificar tiempo entre respuestas (mínimo 2 segundos para prevenir bots)
  if (session.progress.length > 0) {
    const lastAnswer = session.progress[0];
    const timeSinceLastAnswer = Date.now() - lastAnswer.answeredAt.getTime();
    if (timeSinceLastAnswer < 2000) { // 2 segundos
      await logEvent("TRIVIA_TOO_FAST", "Respuesta demasiado rápida", {
        sessionId,
        timeSinceLastAnswer
      });
      return apiError("TOO_FAST", "Espera un momento antes de responder", {}, 429);
    }
  }

  // Verificar que la pregunta existe y está activa
  const question = await prisma.triviaQuestion.findUnique({
    where: { id: questionId, active: true },
    include: { answers: true }
  });

  if (!question) {
    return apiError("QUESTION_NOT_FOUND", "Pregunta no encontrada", {}, 404);
  }

  // Verificar que la respuesta pertenece a la pregunta
  const selectedAnswer = question.answers.find(a => a.id === answerId);
  if (!selectedAnswer) {
    return apiError("INVALID_ANSWER", "Respuesta inválida", {}, 400);
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
    return apiError("QUESTION_ALREADY_ANSWERED", "Pregunta ya respondida", {}, 409);
  }

  // Verificar orden de preguntas (debe responder en orden)
  const totalActiveQuestions = await prisma.triviaQuestion.count({ where: { active: true } });
  const expectedQuestionOrder = session.currentQuestionIndex + 1;

  // Obtener todas las preguntas ordenadas
  const allQuestions = await prisma.triviaQuestion.findMany({
    where: { active: true },
    orderBy: { order: 'asc' }
  });

  if (expectedQuestionOrder <= allQuestions.length) {
    const expectedQuestion = allQuestions[expectedQuestionOrder - 1];
    if (expectedQuestion.id !== questionId) {
      await logEvent("TRIVIA_WRONG_ORDER", "Intento de responder pregunta fuera de orden", {
        sessionId,
        expectedQuestionId: expectedQuestion.id,
        attemptedQuestionId: questionId
      });
      return apiError("WRONG_ORDER", "Debes responder las preguntas en orden", {}, 400);
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

  await logEvent("TRIVIA_QUESTION_ANSWERED", "Pregunta de trivia respondida", {
    sessionId,
    questionId,
    answerId,
    isCorrect
  });

  // Actualizar el índice de pregunta actual en la sesión
  const currentProgressCount = await prisma.triviaProgress.count({
    where: { sessionId: session.id }
  });

  await prisma.triviaSession.update({
    where: { id: session.id },
    data: { currentQuestionIndex: currentProgressCount }
  });

  // Verificar si completó todas las preguntas
  const totalQuestions = await prisma.triviaQuestion.count({ where: { active: true } });
  const completed = currentProgressCount >= totalQuestions;

  let prizeToken = null;
  if (completed) {
    // Completó la trivia - generar token de premio
    prizeToken = await generatePrizeToken(session.id);
    await prisma.triviaSession.update({
      where: { id: session.id },
      data: {
        completed: true,
        completedAt: new Date(),
        prizeTokenId: prizeToken?.id
      }
    });

    await logEvent("TRIVIA_COMPLETED", "Trivia completada exitosamente", {
      sessionId,
      prizeTokenId: prizeToken?.id
    });
  }

  return apiOk({
    isCorrect,
    completed,
    currentQuestionIndex: currentProgressCount,
    totalQuestions,
    prizeToken: prizeToken ? {
      id: prizeToken.id,
      prize: prizeToken.prize
    } : null
  }, 200);
}

async function generatePrizeToken(sessionId: string) {
  // Obtener un premio activo aleatorio
  const prizes = await prisma.prize.findMany({
    where: { active: true }
  });

  if (prizes.length === 0) {
    throw new Error("No hay premios disponibles");
  }

  const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];

  // Crear batch primero
  const batch = await prisma.batch.create({
    data: {
      description: `Trivia completion - ${new Date().toISOString().split('T')[0]}`,
      functionalDate: new Date()
    }
  });

  // Generar signature para el token (simplificada para este ejemplo)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días
  const signature = `trivia-${sessionId}-${Date.now()}`;

  // Crear token con el batch
  const token = await prisma.token.create({
    data: {
      prizeId: randomPrize.id,
      batchId: batch.id,
      expiresAt,
      signature,
      signatureVersion: 1
    },
    include: {
      prize: true,
      batch: true
    }
  });

  return token;
}